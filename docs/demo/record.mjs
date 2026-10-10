import {record} from './studio.mjs';
import {fileURLToPath} from 'node:url';
const tour={async tour(f){
  const p=f.page,button=name=>p.getByRole('button',{name,exact:true});
  f.mark('Page overview and typeface search');await f.move(1040,390,1);await f.scroll(500,1.2);await f.camera(470,270,1.25);await f.type(p.locator('#google-font-search'),'Caveat');await f.click(button('Caveat'));await f.assert(()=>button('Caveat').evaluate(x=>x.className.split(' ').includes('border-[#3a2218]')),'Caveat is selected');await f.camera();
  f.mark('Outline settings');await f.click(p.getByRole('button',{name:/Advanced/}));await f.beat(.3);
  const advanced=await p.locator('#glyph-thickness').boundingBox();if(advanced.y>750)await f.scroll(750,1.1);
  await f.camera(480,400,1.25);await f.drag(p.locator('#glyph-thickness'),.85);await f.click(p.getByText('Dotted',{exact:true}));await f.drag(p.locator('#dot-density'),.8);await f.camera();
  f.mark('Generate and inspect the practice sheet');const submit=button('Make my practice sheet');const b=await submit.boundingBox();if(b.y>820)await f.scroll(await p.evaluate(()=>scrollY)+b.y-650,1);
  await f.click(submit);await f.beat(.4);await p.locator('img[alt="Guideline practice sheet"]').waitFor({state:'visible'});await p.locator('img[alt="Guideline practice sheet"]').evaluate(img=>img.complete?null:new Promise(resolve=>img.onload=resolve));
  const image=await p.locator('img[alt="Guideline practice sheet"]').boundingBox();await f.camera(image.x+image.width/2,image.y+image.height/2,1.4,1);await f.move(image.x+image.width*.7,image.y+image.height*.5,1);await f.beat(.65);
  await f.assert(()=>p.locator('img[alt="Guideline practice sheet"]').evaluate(x=>x.naturalWidth===2550),'Generated PNG is 2550 pixels wide');
 }}.tour;
await record({name:"guideline",url:"https://tracing-sheet-generator.vercel.app",tour,output:fileURLToPath(new URL('../images/',import.meta.url))});
