import { locale } from '../i18n.js';

export default class DatetimeWidget {
  constructor(widget) {
    this.widget=widget;
    this.update();
    this.timer=setInterval(()=>this.update(),1000);
  }
  update() {
    const now=new Date();
    const date=now.toLocaleDateString(locale(),{year:'numeric',month:'long',day:'numeric'});
    const time=now.toLocaleTimeString(locale());
    this.widget.querySelectorAll('[data-role="date"]').forEach(el=>el.textContent=date);
    this.widget.querySelectorAll('[data-role="time"]').forEach(el=>el.textContent=time);
  }
  destroy() { clearInterval(this.timer); }
}
