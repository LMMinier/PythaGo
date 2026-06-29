import Phaser from 'phaser';
import type { GameAction } from './lessons';

export type GameController = {
  actions(actions: GameAction[]): void;
  celebrate(): void;
  destroy(): void;
  move(direction: 'up' | 'down' | 'left' | 'right'): void;
};

class BoroughScene extends Phaser.Scene {
  private player?: Phaser.GameObjects.Arc;
  private robot?: Phaser.GameObjects.Text;
  private status?: Phaser.GameObjects.Text;
  private lit = new Set<string>();

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x061321);
    for (let y = 38; y < height; y += 56) this.add.line(0, 0, 0, y, width, y, 0x12314d, 0.55).setOrigin(0);
    for (let x = 36; x < width; x += 72) this.add.line(0, 0, x, 0, x, height, 0x12314d, 0.45).setOrigin(0);
    this.add.rectangle(width * 0.5, height * 0.45, Math.min(width - 44, 360), 120, 0x0d2942, 0.9).setStrokeStyle(2, 0x5cecff, 0.35);
    this.add.text(width / 2, 32, 'CODE BOROUGH', { color: '#5cecff', fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold' }).setOrigin(0.5);
    this.player = this.add.circle(width / 2 - 34, height / 2 + 18, 16, 0xffd05a).setStrokeStyle(4, 0xffffff, 0.5);
    this.robot = this.add.text(width / 2 + 20, height / 2, '🤖', { fontSize: '30px' }).setOrigin(0.5);
    this.status = this.add.text(width / 2, height - 34, 'Run Python to restore the city.', { color: '#d7edf8', fontFamily: 'monospace', fontSize: '12px' }).setOrigin(0.5);
  }

  apply(actions: GameAction[]) {
    actions.forEach((action) => {
      if (action.type === 'say') this.say(action.message);
      if (action.type === 'activate') this.light(action.target);
      if (action.type === 'recharge') this.flash(0x5df28e, `+${action.amount} grid charge`);
      if (action.type === 'unlock') this.flash(0x5cecff, `${action.gate} gate unlocked`);
    });
  }

  move(direction: 'up' | 'down' | 'left' | 'right') {
    if (!this.player) return;
    const delta = 28;
    const x = direction === 'left' ? -delta : direction === 'right' ? delta : 0;
    const y = direction === 'up' ? -delta : direction === 'down' ? delta : 0;
    this.tweens.add({ targets: this.player, x: Phaser.Math.Clamp(this.player.x + x, 20, this.scale.width - 20), y: Phaser.Math.Clamp(this.player.y + y, 50, this.scale.height - 24), duration: 120 });
  }

  celebrate() {
    this.cameras.main.flash(220, 93, 242, 142);
    this.status?.setText('Mission passed! The borough is brighter.');
  }

  private say(message: string) {
    this.status?.setText(message.slice(0, 58));
  }

  private light(target: string) {
    if (this.lit.has(target)) return;
    this.lit.add(target);
    const x = 42 + (this.lit.size * 47) % Math.max(90, this.scale.width - 84);
    const y = 76 + (this.lit.size * 39) % Math.max(120, this.scale.height - 140);
    this.add.star(x, y, 5, 5, 15, 0xffd05a).setData('target', target);
    this.flash(0xffd05a, `${target} activated`);
  }

  private flash(color: number, text: string) {
    this.status?.setText(text);
    const glow = this.add.circle(this.scale.width / 2, this.scale.height / 2, 12, color, 0.55);
    this.tweens.add({ targets: glow, radius: 220, alpha: 0, duration: 650, onComplete: () => glow.destroy() });
  }
}

export function createGame(parent: HTMLElement, _baseUrl: string): GameController {
  const scene = new BoroughScene('borough');
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#030a14',
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 360, height: parent.clientHeight || 260 },
    scene,
  });

  return {
    actions(actions) { scene.apply(actions); },
    celebrate() { scene.celebrate(); },
    move(direction) { scene.move(direction); },
    destroy() { game.destroy(true); },
  };
}
