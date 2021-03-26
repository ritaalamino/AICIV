class Slider {
	constructor({
		x,
		y,
		height,
		width,
		parent,
		value = 50,
		handleWidth = 10,
		handleHeight = 10
	}) {
		this.parent = parent;
		this.container = new PIXI.Container();
		this.graphics_container = new PIXI.Graphics();
		this.trailing = new PIXI.Graphics();
		this.handle = new PIXI.Graphics();

		this.container.addChild(this.graphics_container);
		this.container.addChild(this.trailing);
		this.container.addChild(this.handle);


		this.handle.interactive = true;
		this.handle.buttonMode = true;

		this.x = x;
		this.y = y;
		this.height = height;
		this.width = width;
		this.value = value;
		this.handleWidth = handleWidth;
		this.handleHeight = handleHeight;
		this.listeners = [];

		this.handle
			.on('pointerdown', this.onDragStart.bind(this))
			.on('pointerup', this.onDragEnd.bind(this))
			.on('pointerupoutside', this.onDragEnd.bind(this))
			.on('pointermove', this.onDragMove.bind(this));
		this.fill();

	}


	draw() {
		this.parent.addChild(this.container);
	}

	fill() {
		this.graphics_container.clear();
		this.trailing.clear();
		this.handle.clear();

		this.graphics_container.beginFill(0xcccccc);

		// anchor manual em 0.5
		this.graphics_container.drawRect(
			this.x - this.width / 2,
			this.y + this.height / 2,
			this.width, this.height
		);
		this.graphics_container.endFill();

		this.trailing.beginFill(0xF831FF);
		this.trailing.drawRect(
			this.x - this.width / 2,
			this.y + this.height / 2,
			this.width * (this.value / 100), this.height
		);

		this.trailing.endFill();

		this.handle.beginFill(0x333333);
		this.handle.drawRect(
			(this.x - this.width / 2) + this.width * (this.value / 100),
			(this.y - this.handleHeight / 2) + this.height / 2,
			this.handleWidth, this.handleHeight + this.height
		);
		this.handle.endFill();

	}

	setPos(x, y) {
		this.x = x;
		this.y = y;
		this.fill();
	}

	onDragStart(event) {
		this.handle.dragging = true;
		this.handle.data = event.data;
	}
	onDragEnd() {
		this.handle.dragging = false;
		this.handle.data = null;
	}
	onDragMove() {
		if (this.handle.dragging) {
			const { x } = this.handle.data.getLocalPosition(this.parent);
			const initX = this.x - this.width / 2;
			const value = ((x - initX) / this.width) * 100;
			const newValue = value > 0 ? value <= 100 ? value : 100 : 0
			this.setValue(newValue);
			this._notifyAll(newValue);
		}
	}


	_notifyAll(data) {
		this.listeners.forEach(listener => {
			if (typeof listener === "function")
				listener(data)
		});
	}

	onChange(callback) {
		this.listeners.push(callback);
		return this;
	}

	setValue(x) {
		this.value = x;
		this.fill();
	}
}