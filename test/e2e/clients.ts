import { Client } from 'discord.js';

export let devBot: Client;
export let testUserBot: Client;

export function setDevBot(client: Client): void {
  devBot = client;
}

export function setTestUserBot(client: Client): void {
  testUserBot = client;
}
