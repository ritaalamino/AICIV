class InstructionsView {
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

        const title = new PIXI.Text('COMO JOGAR', {
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


        const content = new PIXI.Sprite.from('/img/instructions_text.svg');
        content.height = app.screen.height * .8 > 450 ? 450 : app.screen.height * .8;
        content.width = app.screen.width * .8 > 900 ? 900 : app.screen.width * .8;
        content.scale.set(1);
        content.anchor.set(0.5)
        content.x = app.screen.width / 2;
        content.y = app.screen.height / 2;

        this.container.addChild(content);
    }

    draw() {
        this.parent.addChild(this.container);
    }
}