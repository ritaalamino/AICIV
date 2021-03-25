class Button {
	constructor(
		src,
		x,
		y,
		anchor,
		onClick
	) {
		this.sprite = PIXI.Sprite.from(src);
		this.anchor = anchor;
		this.x = x;
		this.y = y;
		this.sprite.anchor.set(this.anchor);
		this.sprite.x = x;
		this.sprite.y = y;
		this.sprite.interactive = true;
		this.sprite.on('pointerdown', onClick);
		this.sprite.buttonMode = true;
		this.sprite.
			on('pointerover', function () {
				this.scale.set(1.2, 1.2);
			})
			.on('pointerout', function () {
				this.scale.set(1, 1);
			});

	}
}


