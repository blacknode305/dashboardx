/** Local-only contact import and search controller. No automatic uploads. */
export default class SmartContactsWidget {
  constructor() { this.contacts = []; }
  importVCF(source) {
    if (typeof source !== 'string' || source.length > 5_000_000) throw new TypeError('Invalid VCF');
    const unfolded = source.replace(/\r?\n[ \t]/g, '');
    const records = unfolded.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) ?? [];
    const added = [];
    for (const record of records) {
      const fields = record.split(/\r?\n/);
      const get = key => {
        const line = fields.find(v => v.split(':',1)[0].split(';',1)[0].toUpperCase() === key);
        return line ? line.slice(line.indexOf(':') + 1).replace(/\\([,;\\nN])/g, (_,c)=> c.toLowerCase()==='n'?'\n':c) : '';
      };
      const name = get('FN') || get('N').replace(/;/g,' ').trim();
      const phone = get('TEL');
      const email = get('EMAIL');
      if (!name && !phone && !email) continue;
      added.push({id: crypto.randomUUID(),name,phone,email});
    }
    this.contacts.push(...added);
    return { imported: added.length, total: this.contacts.length };
  }
  search(query = '') {
    const term = String(query).toLocaleLowerCase();
    return this.contacts.filter(v => [v.name,v.phone,v.email].some(x => x.toLocaleLowerCase().includes(term)));
  }
  getState() { return { count:this.contacts.length, contacts:this.contacts.map(v=>({...v})) }; }
  destroy() { this.contacts = []; }
}
