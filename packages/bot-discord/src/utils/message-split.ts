const DISCORD_MAX_LENGTH = 2000;

export function splitMessage(text: string): string[] {
  if (text.length <= DISCORD_MAX_LENGTH) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let current = '';

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 2 > DISCORD_MAX_LENGTH) {
      if (current.trim()) chunks.push(current.trim());

      if (paragraph.length > DISCORD_MAX_LENGTH) {
        const lines = paragraph.split('\n');
        current = '';
        for (const line of lines) {
          if (current.length + line.length + 1 > DISCORD_MAX_LENGTH) {
            if (current.trim()) chunks.push(current.trim());
            current = line + '\n';
          } else {
            current += line + '\n';
          }
        }
      } else {
        current = paragraph + '\n\n';
      }
    } else {
      current += paragraph + '\n\n';
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
