import { getPendingJobs, markJobProcessing, markJobCompleted, markJobFailed, recoverZombieJobs } from './db.js';
import { getAgent } from './registry.js';
import { createAgentJob } from './db.js';
import { createFormationEvent } from '../db/formation/events.js';
import { getSupabase } from '../db/client.js';
import type { AgentOrigin, AgentOutputFile } from './types.js';
import { logger } from '../logger.js';

async function uploadToStorage(file: AgentOutputFile, jobId: string, agentName: string): Promise<string> {
  const db = getSupabase();
  const storagePath = `${agentName}/${jobId}/${file.filename}`;

  const { error } = await db.storage
    .from('agent-outputs')
    .upload(storagePath, file.buffer, {
      contentType: file.mimeType,
      upsert: true,
    });

  if (error) {
    logger.error({ error, storagePath }, 'Failed to upload agent output to storage');
    throw error;
  }

  return storagePath;
}

async function downloadFromStorage(storagePath: string): Promise<Buffer> {
  const db = getSupabase();
  const { data, error } = await db.storage
    .from('agent-outputs')
    .download(storagePath);

  if (error) {
    logger.error({ error, storagePath }, 'Failed to download from storage');
    throw error;
  }

  return Buffer.from(await data.arrayBuffer());
}

export { downloadFromStorage };

export async function processAgentJobs(): Promise<void> {
  // Recover jobs stuck in 'processing' for too long
  await recoverZombieJobs();

  const jobs = await getPendingJobs(3);
  if (jobs.length === 0) return;

  logger.info({ count: jobs.length }, 'Processing agent jobs');

  for (const job of jobs) {
    const agent = getAgent(job.agent_name);
    if (!agent) {
      await markJobFailed(job.id, `Agent "${job.agent_name}" not registered`);
      continue;
    }

    try {
      await markJobProcessing(job.id);

      const output = await agent.execute(job.input, {
        jobId: job.id,
        origin: job.origin as AgentOrigin,
        parentJobId: job.parent_job_id ?? undefined,
      });

      // Upload files to storage
      const storedFiles: Array<{ storage_path: string; filename: string; mime_type: string }> = [];
      if (output.files) {
        for (const file of output.files) {
          const storagePath = await uploadToStorage(file, job.id, job.agent_name);
          storedFiles.push({
            storage_path: storagePath,
            filename: file.filename,
            mime_type: file.mimeType,
          });
        }
      }

      await markJobCompleted(job.id, {
        text: output.text,
        files: storedFiles,
      });

      // Handle chaining: if the agent or the job requests a chain
      const chainTarget = output.chainTo ?? job.chain_to;
      if (chainTarget) {
        // Resolve origin: use original origin (from root job)
        const origin = job.origin as AgentOrigin;
        await createAgentJob({
          agentName: chainTarget.agentName,
          input: chainTarget.input,
          origin,
          parentJobId: job.id,
        });
        logger.info(
          { fromAgent: job.agent_name, toAgent: chainTarget.agentName, parentJobId: job.id },
          'Agent job chained'
        );
      }

      // Determine delivery target based on origin platform
      const origin = job.origin as AgentOrigin;
      let eventTarget: string;
      switch (origin.platform) {
        case 'telegram':
          eventTarget = 'telegram-admin';
          break;
        case 'discord':
          eventTarget = 'discord';
          break;
        default:
          eventTarget = 'telegram-admin';
      }

      // Create delivery event (only for completed jobs, not chained intermediate ones)
      // If this job chains to another, the final delivery will come from the last job
      if (!chainTarget) {
        await createFormationEvent({
          type: 'agent_job_completed',
          source: `agent:${job.agent_name}`,
          target: eventTarget,
          data: {
            job_id: job.id,
            agent_name: job.agent_name,
            chat_id: origin.chatId,
            result_text: output.text ?? null,
            result_files: storedFiles,
          },
        });
      }

      logger.info(
        { jobId: job.id, agentName: job.agent_name, filesCount: storedFiles.length },
        'Agent job completed'
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err, jobId: job.id, agentName: job.agent_name }, 'Agent job failed');
      await markJobFailed(job.id, errorMsg);

      // Notify the user that the job failed
      try {
        const origin = job.origin as AgentOrigin;
        let eventTarget: string;
        switch (origin.platform) {
          case 'telegram':
            eventTarget = 'telegram-admin';
            break;
          case 'discord':
            eventTarget = 'discord';
            break;
          default:
            eventTarget = 'telegram-admin';
        }

        await createFormationEvent({
          type: 'agent_job_completed',
          source: `agent:${job.agent_name}`,
          target: eventTarget,
          data: {
            job_id: job.id,
            agent_name: job.agent_name,
            chat_id: origin.chatId,
            result_text: `Erreur de l'agent "${job.agent_name}" : ${errorMsg}`,
            result_files: [],
          },
        });
      } catch (notifyErr) {
        logger.error({ notifyErr, jobId: job.id }, 'Failed to notify user about agent job failure');
      }
    }
  }
}
