class Button {
	constructor(
		src,
		x,
		y,
		anchor,
		onClick,
		soundHover = false,
		soundClick = false,
	) {
		this.sprite = PIXI.Sprite.from(src);
		this.anchor = anchor;
		this.x = x;
		this.y = y;
		this.sprite.anchor.set(this.anchor);
		this.sprite.x = x;
		this.sprite.y = y;
		this.sprite.interactive = true;
		this.sprite.buttonMode = true;
		this.soundClickEnabled = soundClick;
		this.soundClick = new sound('/sounds/click_sound.mp3', false);
		this.soundClick.setVolume(store.get('game@effects'));
		this.soundHoverEnabled = soundHover;
		this.soundInHover = false;
		this.soundHover = new sound('/sounds/hover_sound.mp3', false);
		this.soundHover.setVolume(store.get('game@effects'));
		store.observe('game@effects', (val) => {
			this.soundClick.setVolume(val);
			this.soundHover.setVolume(val);
		});
		this.sprite.
			on('pointerover', function (e) {
				this.sprite.scale.set(1.2, 1.2);
				if (this.soundHoverEnabled && !this.soundInHover) {
					this.soundHover.play();
					this.soundInHover = true;
				}
			}.bind(this))
			.on('pointerout', function () {
				this.sprite.scale.set(1, 1);
				if (this.soundHoverEnabled && this.soundInHover) {
					this.soundHover.stop();
					this.soundInHover = false;
				}
			}.bind(this))
			.on('pointerdown', function () {
				if (this.soundClickEnabled) {
					if (this.soundHoverEnabled && this.soundInHover) {
						this.soundHover.stop();
						this.soundInHover = false;
					}
					this.soundClick.play();
				}
				onClick();
			}.bind(this));
		;


	}
}


