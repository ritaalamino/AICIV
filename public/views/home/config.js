class ConfigView {
	constructor(parent) {
		this.parent = parent;
		this.container = new PIXI.Container();
		this.init();
	}


	init() {

		const logo = PIXI.Sprite.from('/img/logo.png');
		logo.anchor.set(0.5);
		logo.x = app.screen.width * 0.2;
		logo.y = app.screen.height * 0.10;
		this.container.addChild(logo);

		const title = new PIXI.Text('Configurações', {
			fontFamily: 'Roboto',
			fontSize: 50,
			fill: 'white',
			align: 'left',
		});
		title.anchor.set(0.5);
		title.position.set(app.screen.width / 2, app.screen.height * 0.1);
		this.container.addChild(title);

		const back = new PIXI.Text('Voltar', {
			fontFamily: 'Roboto',
			fontSize: 25,
			fill: 'white',
			align: 'left',
		});
		back.interactive = true;
		back.buttonMode = true;
		back.anchor.set(0.5);
		back.position.set((app.screen.width / 2), app.screen.height - 50);
		back
			.on('pointerover', function () {
				back.style = {
					...back.style,
					fill: '#F831FF'
				};
			}.bind(this))
			.on('pointerout', function () {
				back.style = {
					...back.style,
					fill: 'white'
				};
			}.bind(this))
			.on('pointerdown', function () {
				openContainer(menuContainer);
			}.bind(this))
		this.container.addChild(back);




		this.options = {
			'BGM Volume': [
				new Slider({
					height: 8,
					width: app.screen.width * .2,
					parent: this.container,
					x: 0,
					y: 0,
					value: store.get('game@bgm', 50)
				}).onChange(val => {
					store.set('game@bgm', parseInt(val, 10));
				}),
				120
			],
			'Efeitos Volume': [
				new Slider({
					height: 8,
					width: app.screen.width * .2,
					parent: this.container,
					x: 0,
					y: 0,
					value: store.get('game@effects', 50)
				}).onChange(val => {
					store.set('game@effects', parseInt(val, 10));
				}),
				120
			],

			'Graficos': [
				null,
				120
			],

		};

		console.log('teste', store);
		this.options_labels = [];

		const options = Object.entries(this.options);
		const gap = 10;
		const yOptions = app.screen.height * 0.25;
		for (let i = 0; i < options.length; i++) {
			const [element, size] = options[i][1];
			const label = options[i][0];
			const temp_text = new PIXI.Text(label, {
				fontFamily: 'Roboto',
				fontSize: 38,
				fontWeight: 'bold',
				fill: 'yellow',
				align: 'left',
			});
			temp_text.anchor.set(0.5);
			temp_text.position.set(
				(app.screen.width / 2),
				yOptions + i * (gap + size));
			console.log(temp_text.height);
			this.container.addChild(temp_text);
			if (element) {
				element.draw();
				element.setPos((app.screen.width / 2), yOptions + i * (gap + size) + temp_text.height + 20);
			}
		}

	}

	draw() {
		this.parent.addChild(this.container);
	}
}