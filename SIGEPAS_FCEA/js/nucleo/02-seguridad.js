'use strict';
/* ====================================================================
   SEGURIDAD · cifrado SHA-256 de contraseñas y política de contraseñas.
   ==================================================================== */
const sha256=(()=>{const K=[],H0=[];let n=2,c=0;const isP=x=>{for(let i=2;i*i<=x;i++)if(x%i===0)return false;return true};
 while(c<64){if(isP(n)){if(c<8)H0[c]=(Math.pow(n,.5)%1)*4294967296|0;K[c]=(Math.pow(n,1/3)%1)*4294967296|0;c++}n++}
 const rotr=(x,k)=>(x>>>k)|(x<<(32-k));
 return s=>{const bytes=new TextEncoder().encode(s),l=bytes.length,nb=((l+8)>>6)+1,w=new Int32Array(nb*16);
  for(let i=0;i<l;i++)w[i>>2]|=bytes[i]<<(24-(i%4)*8);w[l>>2]|=0x80<<(24-(l%4)*8);w[nb*16-1]=l*8;
  let h=H0.slice();
  for(let o=0;o<nb*16;o+=16){const W=new Int32Array(64);for(let i=0;i<16;i++)W[i]=w[o+i];
   for(let i=16;i<64;i++){const a=W[i-15],b=W[i-2];W[i]=(W[i-16]+(rotr(a,7)^rotr(a,18)^(a>>>3))+W[i-7]+(rotr(b,17)^rotr(b,19)^(b>>>10)))|0}
   let [a,b,cc,d,e,f,g,hh]=h;
   for(let i=0;i<64;i++){const t1=(hh+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+W[i])|0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&cc)^(b&cc)))|0;hh=g;g=f;f=e;e=(d+t1)|0;d=cc;cc=b;b=a;a=(t1+t2)|0}
   h=[h[0]+a|0,h[1]+b|0,h[2]+cc|0,h[3]+d|0,h[4]+e|0,h[5]+f|0,h[6]+g|0,h[7]+hh|0]}
  return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}})();
/* Política de contraseñas: mínimo 8 caracteres con mayúsculas, minúsculas, números y símbolos. */
const PW_RULES='Mínimo 8 caracteres, con mayúsculas, minúsculas, números y símbolos.';
function passwordMissing(pw){const m=[];if(pw.length<8)m.push('mínimo 8 caracteres');if(!/\p{Lu}/u.test(pw))m.push('una mayúscula');if(!/\p{Ll}/u.test(pw))m.push('una minúscula');if(!/\d/.test(pw))m.push('un número');if(!/[^\p{L}\p{N}\s]/u.test(pw))m.push('un símbolo');return m}
function passwordError(pw){const m=passwordMissing(pw);return m.length?'La contraseña no cumple los requisitos. Falta: '+m.join(', ')+'.':''}
function passwordCheck(pw,cf){if(!pw)return 'Escriba la contraseña y su confirmación.';const e=passwordError(pw);if(e)return e;if(pw!==cf)return 'La confirmación no coincide con la contraseña.';return ''}
function pwLive(pw,cf,match,rules){if(rules){if(!pw.value){rules.className='form-text';rules.textContent=PW_RULES}else{const m=passwordMissing(pw.value);rules.className='form-text '+(m.length?'text-danger':'text-success');rules.textContent=m.length?'Falta: '+m.join(', ')+'.':'La contraseña cumple los requisitos.'}}if(match){if(!cf.value){match.className='form-text';match.textContent=''}else{const ok=cf.value===pw.value;match.className='form-text '+(ok?'text-success':'text-danger');match.textContent=ok?'Las contraseñas coinciden.':'Las contraseñas no coinciden.'}}}
const newSalt=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(16).padStart(2,'0')).join('');
