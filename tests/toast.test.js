const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness.js');

// A minimal DOM for the toast stack: a container with children and elements that can remove themselves.
function withToasts(){
  const a=load();
  a.g(`{const box=$('toasts');box.children=[];box.prepend=e=>{box.children.unshift(e);e.parent=box};
    document.createElement=()=>{const e={className:'',innerHTML:'',hidden:false,classList:{add(c){e.className+=' '+c}},addEventListener(){},remove(){const k=e.parent?.children||[],i=k.indexOf(e);if(i>=0)k.splice(i,1)}};return e}}`);
  const list=()=>a.g(`$('toasts').children.map(e=>({c:e.className,t:e.innerHTML}))`);
  return {...a,list};
}

test('say shows a toast and hides the message line', () => {
  const a=withToasts();
  a.g("say('Fresh content is live.')");
  const l=a.list();
  assert.equal(l.length,1);
  assert.equal(l[0].t,'Fresh content is live.');
  assert.match(l[0].c,/\btoast\b/);
  assert.equal(a.el('msg').hidden,true);
});

test('newest first, at most three', () => {
  const a=withToasts();
  for(const t of ['one','two','three','four'])a.g(`say('${t}')`);
  assert.equal(a.list().map(x=>x.t).join(),'four,three,two');
});

test('the same message replaces its earlier toast', () => {
  const a=withToasts();
  a.g("say('same');say('other');say('same')");
  assert.equal(a.list().map(x=>x.t).join(),'same,other');
});

test('good and bad news colour the toast', () => {
  const a=withToasts();
  a.g(`say('<b class="good">Won.</b> Yes');say('<b class="bad">Lost.</b> No');say('plain')`);
  const [p,b,g]=a.list();
  assert.match(g.c,/\bgood\b/);assert.match(b.c,/\bbad\b/);assert.doesNotMatch(p.c,/good|bad/);
});

test('event dialogs do not also toast', () => {
  const a=withToasts();
  a.g("showEv('bad','Bad news','Outage','x')");
  assert.equal(a.list().length,0);
});
