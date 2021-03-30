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

        const title = new PIXI.Text('CONFIGURAÇÕES', {
            fontFamily: 'Roboto',
            fontSize: 50,
            fill: 'white',
            align: 'left',
        });
        title.anchor.set(0.5);
        title.position.set(app.screen.width / 2, app.screen.height * 0.1);
        this.container.addChild(title);

        const back = new PIXI.Sprite.from('/img/back_button.svg');
        back.interactive = true;
        back.buttonMode = true;
        back.anchor.set(0.5);
        back.position.set((app.screen.width / 2), app.screen.height - 50);
        back
            .on('pointerover', function() {
                back.style = {
                    ...back.style,
                    fill: '#F831FF'
                };
            }.bind(this))
            .on('pointerout', function() {
                back.style = {
                    ...back.style,
                    fill: 'white'
                };
            }.bind(this))
            .on('pointerdown', function() {
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

            'Apelido': [
                new PIXI.TextInput({
                    input: {
                        fontSize: '20px',
                        padding: '12px',
                        width: app.screen.width * 0.25 + 'px',
                        color: '#26272E',
                        height: '20px'
                    },
                    box: {
                        default: { fill: 0xE8E9F3, rounded: 12, stroke: { color: 0xCBCEE0, width: 3 } },
                        focused: { fill: 0xE1E3EE, rounded: 12, stroke: { color: 0xABAFC6, width: 3 } },
                        disabled: { fill: 0xDBDBDB, rounded: 12 }
                    }
                }),
                120
            ],

        };

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
                if (element.draw) {
                    element.draw();
                    element.setPos((app.screen.width / 2), yOptions + i * (gap + size) + temp_text.height + 20);
                } else {
                    element.x = (app.screen.width / 2);
                    element.y = yOptions + i * (gap + size) + temp_text.height + 20;
                    element.pivot.x = element.width / 2;
                    element.pivot.y = element.height / 2;
                    element.placeholder = "Digite seu Nickname";
                    element.text = store.get('game@nickname', store.randomStr())
                    element.on('keydown', keycode => {
                        store.set('game@nickname', element.text)
                    })
                    this.container.addChild(element)
                }
            }
        }

    }

    draw() {
        this.parent.addChild(this.container);
    }
}