import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSegaRom,validateSegaFile,segaFileSystem,hasSegaHeader} from '../client/js/module/Widget/SegaRom.js';

if(typeof globalThis.File!=='function'){
  globalThis.File=class File extends Blob{
    constructor(parts,name,opts={}){super(parts,opts);this.name=name;this.lastModified=opts.lastModified||0;}
  };
}
const testRom=()=>{const buffer=new Uint8Array(32768);buffer.set([83,69,71,65],0x100);return buffer;};
function file(bytes,name){return new File([bytes],name,{type:'application/octet-stream'});}
function interleavedSmd(rom){
  const result=new Uint8Array(rom.length+512);
  for(let block=0;block<rom.length;block+=16384)
    for(let i=0;i<8192;i++){
      result[512+block+i]=rom[block+2*i+1];
      result[512+block+8192+i]=rom[block+2*i];
    }
  return result;
}
function storedZip(rom,name='game.bin'){
  const filename=new TextEncoder().encode(name);
  const central=30+filename.length+rom.length,tail=central+46+filename.length;
  const b=new Uint8Array(tail+22),view=new DataView(b.buffer);
  const u16=(o,n)=>view.setUint16(o,n,true),u32=(o,n)=>view.setUint32(o,n,true);
  u32(0,0x04034b50);u16(4,20);u32(18,rom.length);u32(22,rom.length);
  u16(26,filename.length);b.set(filename,30);b.set(rom,30+filename.length);
  u32(central,0x02014b50);u16(central+4,20);u16(central+6,20);
  u32(central+20,rom.length);u32(central+24,rom.length);
  u16(central+28,filename.length);b.set(filename,central+46);
  u32(tail,0x06054b50);u16(tail+8,1);u16(tail+10,1);
  u32(tail+12,46+filename.length);u32(tail+16,central);
  return b;
}
test('Sega cartridge systems and disallowed Sega CD are diagnosed',()=>{
  assert.equal(segaFileSystem('game.gen'),'segaMD');
  assert.equal(segaFileSystem('game.sms'),'segaMS');
  assert.equal(segaFileSystem('game.gg'),'segaGG');
  assert.equal(segaFileSystem('game.32x'),'sega32x');
  assert.throws(()=>validateSegaFile({name:'disc.cue',size:50000}),/Sega CD/);
});
test('SMD old interleaved cartridge format converts to standard headerless binary',async()=>{
  const original=testRom(),output=await prepareSegaRom(file(interleavedSmd(original),'old.smd'));
  assert.equal(output.file.name,'old.bin');
  assert.equal(output.system,'segaMD');
  assert.equal(output.recognized,true);
  assert.deepEqual(new Uint8Array(await output.file.arrayBuffer()),original);
});
test('pair-swapped ROM header and optional copier header are repaired',async()=>{
  const source=testRom(),swapped=new Uint8Array(source);
  for(let i=0;i<swapped.length;i+=2)[swapped[i],swapped[i+1]]=[swapped[i+1],swapped[i]];
  const repaired=await prepareSegaRom(file(swapped,'old.gen'));
  assert.deepEqual(new Uint8Array(await repaired.file.arrayBuffer()),source);
  const extra=new Uint8Array(source.length+512);
  extra.set(source,512);
  const stripped=await prepareSegaRom(file(extra,'old.gen'));
  assert.equal(stripped.file.size,source.length);
  assert.ok(hasSegaHeader(new Uint8Array(await stripped.file.arrayBuffer())));
});
test('ZIP containing a single cartridge is unpacked locally',async()=>{
  const rom=testRom();
  const output=await prepareSegaRom(file(storedZip(rom,'Sonic.gen'),'Sonic.zip'));
  assert.equal(output.system,'segaMD');
  assert.ok(output.notes.some(note=>note.includes('ZIP')));
  assert.deepEqual(new Uint8Array(await output.file.arrayBuffer()),rom);
});
test('unsupported ZIP payload is rejected with a meaningful error',async()=>{
  await assert.rejects(prepareSegaRom(file(storedZip(testRom(),'disc.cue'),'disc.zip')),
    /не найден картриджный ROM/);
});
