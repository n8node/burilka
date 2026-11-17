import * as THREE from "three";

/** Five tapered alternating fabric sections and a pole, matching the reference rig. */
export class Windsock {
  readonly group = new THREE.Group();
  readonly head = new THREE.Group();
  readonly sock = new THREE.Group();
  private readonly baseX: number;

  constructor(x: number, z: number, private readonly followsRig: boolean) {
    this.baseX = x;
    this.group.name = followsRig ? "windsock-rig" : "windsock-camp";
    this.group.position.set(x, 0, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 7, 8), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.7 }));
    pole.position.y = 3.5;
    pole.castShadow = true;
    this.head.position.y = 7;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 6, 16), new THREE.MeshStandardMaterial({ color: 0x555c61, roughness: 0.7 }));
    ring.rotation.y = Math.PI / 2;
    this.head.add(ring, this.sock);
    const length = 2.3;
    for (let i = 0; i < 5; i++) {
      const upper = 0.36 - i * 0.045;
      const lower = 0.36 - (i + 1) * 0.045;
      const material = new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffffff : 0xff6a1a, roughness: 0.7, side: THREE.DoubleSide });
      const section = new THREE.Mesh(new THREE.CylinderGeometry(lower, upper, length / 5, 14, 1, true), material);
      section.rotation.x = Math.PI / 2;
      section.position.z = (i + 0.5) * length / 5;
      section.castShadow = true;
      this.sock.add(section);
    }
    this.group.add(pole, this.head);
  }

  update(time: number, wind: number, windDirDeg: number, rigX: number): void {
    const direction = THREE.MathUtils.degToRad(windDirDeg);
    const gust = 1 + 0.2 * Math.sin(time * 0.63) * Math.sin(time * 1.7 + 1) + 0.08 * Math.sin(time * 3.1);
    const speed = Math.max(0, wind * gust);
    this.group.position.x = this.baseX + (this.followsRig ? rigX : 0);
    this.head.rotation.y = Math.atan2(-Math.sin(direction), Math.cos(direction)) + 0.06 * Math.sin(time * 2.3) * Math.min(1, speed / 3);
    this.sock.rotation.x = (1 - Math.min(1, speed / 13)) * 1.25 + 0.05 * Math.sin(time * 5 + speed) * Math.min(1, speed / 3);
    this.sock.rotation.z = 0.08 * Math.sin(time * 7.3) * Math.min(1, speed / 8);
  }
}