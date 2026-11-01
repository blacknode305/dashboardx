import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validDiscordId,discordChannelLink,discordInviteLink,discordWidgetURL,normalizeDiscordServers}
  from '../client/js/module/Widget/DiscordPortal.js';

test('discord server IDs and deep links are validated',()=>{
  const guild='123456789012345678',channel='223456789012345678';
  assert.ok(validDiscordId(guild));
  assert.equal(discordChannelLink(guild,channel),
    'https://discord.com/channels/'+guild+'/'+channel);
  assert.throws(()=>discordChannelLink('wrong',channel),/ID/);
  assert.throws(()=>discordChannelLink(guild,'javascript:alert(1)'),/ID/);
  assert.equal(discordWidgetURL(guild,'light'),
    'https://discord.com/widget?id='+guild+'&theme=light');
  assert.equal(discordWidgetURL(guild,'unknown'),
    'https://discord.com/widget?id='+guild+'&theme=dark');
});
test('invite validation prevents unrelated or spoofed hosts',()=>{
  assert.equal(discordInviteLink('https://discord.gg/AbCd12'),
    'https://discord.com/invite/AbCd12');
  assert.equal(discordInviteLink('https://discord.com/invite/Example-1'),
    'https://discord.com/invite/Example-1');
  assert.throws(()=>discordInviteLink('https://discord.gg.attacker.com/example'),/Discord/);
  assert.throws(()=>discordInviteLink('https://evil.com/invite/abc123'),/Discord/);
  assert.throws(()=>discordInviteLink('https://discord.com/invite/abc?redirect=evil'),/discord.gg|Discord/);
});
test('invalid persisted rooms are removed and no fake server data is generated',()=>{
  const list=normalizeDiscordServers([{id:'123456789012345678',name:'Our server',
    channels:[{id:'223456789012345678',name:'Voice',kind:'voice'},
      {id:'not-a-id',name:'Bad',kind:'text'}]},
    {id:'bad',name:'Invalid'}]);
  assert.equal(list.length,1);
  assert.equal(list[0].channels.length,1);
  assert.equal(list[0].channels[0].kind,'voice');
});
test('Discord portal only uses public widget data and opens the real Discord client',()=>{
  const source=readFileSync(new URL('../client/js/module/Widget/DiscordPortal.js',import.meta.url),'utf8');
  const markup=readFileSync(new URL('../client/_discordPortal.html',import.meta.url),'utf8');
  const css=readFileSync(new URL('../client/css/style.css',import.meta.url),'utf8');
  const registry=readFileSync(new URL('../client/js/module/WidgetLogic.js',import.meta.url),'utf8');
  const catalog=readFileSync(new URL('../client/js/index.js',import.meta.url),'utf8');
  assert.match(source,/https:\/\/discord\.com\/api\/guilds\//);
  assert.match(source,/credentials:'omit'/);
  assert.match(source,/sandbox/);
  assert.match(markup,/data-id="discordPortal"/);
  assert.match(markup,/data-role="dc-channel-form"/);
  assert.match(css,/discord-portal\.css/);
  assert.match(registry,/DiscordPortalWidget/);
  assert.match(catalog,/discordPortal:/);
});
