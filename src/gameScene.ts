import type * as Phaser from 'phaser';
import type { GameAction } from './lessons';

export type Direction='up'|'down'|'left'|'right';
export interface GameController { move:(d:Direction)=>void; actions:(a:GameAction[])=>void; celebrate:()=>void; destroy:()=>void; }

// Phaser is loaded from a CDN at runtime (like the Pyodide runtime) so bundlers
// such as Expo Snack never have to resolve the large npm package. The npm dep is
// kept as a devDependency for TypeScript types and local builds only.
const PHASER_CDN='https://cdn.jsdelivr.net/npm/phaser@4.2.0/dist/phaser.min.js';
let phaserPromise:Promise<any>|undefined;
function loadPhaser():Promise<any>{
  if(typeof window!=='undefined'&&(window as any).Phaser) return Promise.resolve((window as any).Phaser);
  if(phaserPromise) return phaserPromise;
  phaserPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=PHASER_CDN; script.async=true;
    script.onload=()=>resolve((window as any).Phaser);
    script.onerror=()=>reject(new Error('Failed to load Phaser from CDN.'));
    document.head.appendChild(script);
  });
  return phaserPromise;
}

export async function createGame(parent:HTMLElement,base:string):Promise<GameController>{
  const P:any=await loadPhaser();
  class Scene extends P.Scene{
    hero!:Phaser.GameObjects.Sprite; byte!:Phaser.GameObjects.Sprite; terminals=new Map<string,Phaser.GameObjects.Container>();
    constructor(){super('borough');}
    preload(){
      this.load.image('city',base+'game/city-background.svg');
      this.load.image('hero',base+'game/hero.svg');
      this.load.image('byte',base+'game/byte.svg');
    }
    create(){
      this.add.image(450,250,'city').setDisplaySize(900,500);
      this.add.rectangle(450,420,900,160,0x04101e,.55);
      this.add.text(24,22,'WORKSHOP DISTRICT',{fontFamily:'Arial Black',fontSize:'24px',color:'#65ebff',stroke:'#04101e',strokeThickness:7});
      this.add.text(26,57,'Grid signal: unstable',{fontFamily:'monospace',fontSize:'14px',color:'#ffd05a',backgroundColor:'#071528cc',padding:{x:9,y:5}});
      this.hero=this.add.sprite(350,350,'hero').setScale(.33).setDepth(10);
      this.byte=this.add.sprite(475,375,'byte').setScale(.28).setDepth(11);
      this.tweens.add({targets:this.hero,y:'-=5',duration:900,yoyo:true,repeat:-1,ease:'Sine.InOut'});
      this.tweens.add({targets:this.byte,y:'-=7',duration:700,yoyo:true,repeat:-1,ease:'Sine.InOut'});
      this.terminal(690,345,'street_display','SIGNAL'); this.terminal(790,365,'tunnel_gate','GATE'); this.terminal(110,365,'architect_core','CORE');
      this.game.events.on('move',this.move,this); this.game.events.on('actions',this.handleActions,this); this.game.events.on('celebrate',this.celebrate,this);
    }
    terminal(x:number,y:number,id:string,label:string){
      const glow=this.add.rectangle(0,0,66,78,0x26dff5,.18).setStrokeStyle(2,0x6decff,.7);
      const body=this.add.rectangle(0,8,50,66,0x071b2f,.96).setStrokeStyle(3,0x39d8ef,.9);
      const screen=this.add.rectangle(0,-2,36,24,0x06111d,1).setStrokeStyle(2,0x65edff,.9);
      const text=this.add.text(0,-2,label,{fontFamily:'monospace',fontSize:'9px',color:'#7ff5ff'}).setOrigin(.5);
      const c=this.add.container(x,y,[glow,body,screen,text]).setDepth(7); this.terminals.set(id,c);
      this.tweens.add({targets:glow,alpha:{from:.08,to:.38},duration:850,yoyo:true,repeat:-1});
    }
    move(d:Direction){
      let x=this.hero.x,y=this.hero.y,row=3; if(d==='left'){x-=30;row=1} if(d==='right'){x+=30;row=0} if(d==='up'){y-=25;row=2} if(d==='down'){y+=25;row=3}
      x=P.Math.Clamp(x,65,835); y=P.Math.Clamp(y,245,410);
      if(d==='left')this.hero.setFlipX(true); if(d==='right')this.hero.setFlipX(false);
      this.tweens.add({targets:this.hero,x,y,angle:d==='up'?-2:d==='down'?2:0,duration:150,ease:'Sine.Out'});
      this.tweens.add({targets:this.byte,x:x+105,y:y+28,duration:380,ease:'Sine.Out'});
    }
    handleActions(list:GameAction[]){list.forEach((a,i)=>this.time.delayedCall(i*260,()=>this.action(a)));}
    action(a:GameAction){
      if(a.type==='say'){this.speech(a.speaker,a.text);return;}
      if(a.type==='activate'&&a.target.toLowerCase()==='byte'){this.flash(this.byte,0x63efff);return;}
      if(a.type==='recharge'){this.flash(this.byte,0xffcf52);return;}
      const t=this.terminals.get(a.target); if(t)this.flash(t,a.type==='unlock'?0xffcf52:0x64f58e);
    }
    flash(target:Phaser.GameObjects.GameObject,color:number){
      if('setTint' in target)(target as Phaser.GameObjects.Sprite).setTint(color);
      this.tweens.add({targets:target,scaleX:'*=1.16',scaleY:'*=1.16',duration:180,yoyo:true,repeat:1,onComplete:()=>{'clearTint' in target&&(target as Phaser.GameObjects.Sprite).clearTint()}});
    }
    speech(speaker:string,msg:string){
      const panel=this.add.rectangle(450,105,520,82,0x061425,.96).setStrokeStyle(3,0x58e8fa,.9).setDepth(40);
      const who=this.add.text(215,80,speaker.toUpperCase(),{fontFamily:'Arial Black',fontSize:'14px',color:'#ffd05a'}).setDepth(41);
      const text=this.add.text(215,103,msg,{fontFamily:'Arial',fontSize:'17px',color:'#f4fbff',wordWrap:{width:470}}).setDepth(41);
      this.time.delayedCall(3200,()=>{panel.destroy();who.destroy();text.destroy();});
    }
    celebrate(){
      this.tweens.add({targets:this.hero,y:this.hero.y-36,duration:220,yoyo:true,repeat:2});
      this.tweens.add({targets:this.byte,angle:360,duration:700,ease:'Back.Out'});
    }
  }
  const game=new P.Game({type:P.AUTO,parent,width:900,height:500,backgroundColor:'#071525',antialias:true,scene:Scene,scale:{mode:P.Scale.FIT,autoCenter:P.Scale.CENTER_BOTH,width:900,height:500}});
  return {move:d=>game.events.emit('move',d),actions:a=>game.events.emit('actions',a),celebrate:()=>game.events.emit('celebrate'),destroy:()=>game.destroy(true)};
}
