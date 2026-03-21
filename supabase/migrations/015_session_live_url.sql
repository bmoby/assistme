-- Replace live_channel (Discord channel name) with live_url (Google Meet link)
ALTER TABLE sessions RENAME COLUMN live_channel TO live_url;
