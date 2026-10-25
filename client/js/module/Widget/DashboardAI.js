/**
 * Client-only AI controller. Credentials must live exclusively on the server.
 * It requires an authenticated gateway; the gatewayFetch adapter handles origin and credentials.
 */
export default class DashboardAIWidget {
  constructor({endpoint='/api/ai/chat',fetchImpl=fetch}={}) {
    if (endpoint !== '/api/ai/chat') throw new TypeError('Only the approved AI API route is allowed');
    this.endpoint=endpoint;
    this.fetchImpl=fetchImpl;
    this.history=[];
    this.status='idle';
  }
  getState(){return {status:this.status,history:this.history.map(x=>({...x}))};}
  async ask(message){
    if(typeof message!=='string'||!message.trim()||message.length>4000)throw new TypeError('Invalid message');
    this.status='loading';
    try{
      const response=await this.fetchImpl(this.endpoint,{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:message.trim(),messages:[...this.history.slice(-19).map(item=>({role:item.role,content:item.text})),{role:'user',content:message.trim()}]})
      });
      if(!response.ok)throw new Error('AI endpoint unavailable: HTTP '+response.status);
      const data=await response.json();
      if(typeof data.reply!=='string')throw new Error('Invalid AI response');
      this.history.push({role:'user',text:message.trim()},{role:'assistant',text:data.reply});
      this.status='ready';
      return data.reply;
    }catch(error){this.status='error';throw error;}
  }
  destroy(){this.history=[];}
}
