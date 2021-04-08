import * as PIXI from 'pixi.js';
import 'pixi-spine';
import PixiFps from "pixi-fps";
import { Scrollbox } from 'pixi-scrollbox';
import { PRECISION, TextStyle } from 'pixi.js';

PIXI.settings.RESOLUTION = 1;
// PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; 
// PIXI.settings.ROUND_PIXELS = false;

const app = new PIXI.Application({
    width: 1280,
    height: 720,
    backgroundColor: 0x1099bb,
    view: document.querySelector('#scene'),  
    autoDensity: true,
    resolution: window.devicePixelRatio,
});
document.body.appendChild(app.view);

app.loader
    .add('midori', 'assets/images/midori_spr.skel', { metadata: { spineSkeletonScale: 0.5 } })
    .add('menu', 'assets/script/menu.json')
    .add('menuText', 'assets/script/LocalizeScenarioExcelTable.json')
    .load(onAssetsLoaded);

app.stage.interactive = true;

function download_sprite_as_png(renderer, sprite, fileName) {
	renderer.extract.canvas(sprite).toBlob(function(b){
		var a = document.createElement('a');
		document.body.append(a);
		a.download = fileName;
		a.href = URL.createObjectURL(b);
		a.click();
		a.remove();
	}, 'image/png');
}

const menuText = {};

function onAssetsLoaded(loader, res) {

    // const fpsCounter = new PixiFps();
    // app.stage.addChild(fpsCounter);
    
    const midori = new PIXI.spine.Spine(res.midori.spineData);

    // console.log(midori.width);
    // console.log(midori.height);

    midori.scale.set(0.5);

    midori.state.setAnimation(0, 'Idle_01', true);

    // set the position
    midori.x = 1280 - midori.width / 2 - 50; //app.screen.width / 2;
    midori.y = 50 + 720 - midori.height / 2; //(app.screen.height / 2) + 100;
    

    const scrollbox = new Scrollbox({ boxWidth: 200, boxHeight: 200, overflow: "scroll"});
    scrollbox.x = 0;
    scrollbox.y = 0;
    
    // app.stage.addChild(scrollbox);
    // scrollbox.content.addChild(midori);

    // scrollbox.update();

    app.stage.addChild(midori);

    const singleAnimations = ['00'];
    const loopAnimations = ['Idle_01'];
    const allAnimations = [].concat(singleAnimations, loopAnimations);

    let lastAnimation = '';

    document.addEventListener('keydown', (key) => {
        if (key.key === 's') {
            download_sprite_as_png(app.renderer, midori, "derp.png");
        }
    });

    // Press the screen to play a random animation
    // app.stage.on('pointerdown', () => {
    //     // console.log("derp");
    //     // let animation = '';
    //     // do {
    //     //     animation = allAnimations[Math.floor(Math.random() * allAnimations.length)];
    //     // } while (animation === lastAnimation);

    //     // midori.state.setAnimation(0, animation, loopAnimations.includes(animation));

    //     // lastAnimation = animation;

    //     midori.state.setAnimation(0, 'Idle_01', true);
    // });

    res.menuText.data.DataList.forEach((item) => {
        menuText[item.Key] = item;
    });

    loadMenu(res.menu.data);
}

function loadMenu(menuData) {
    const menuStack = [];
    const container = new PIXI.Container();
    const menuContainer = new PIXI.Container();
    app.stage.addChild(container);
    container.addChild(menuContainer);

    menuContainer.locale = 'En';

    // Add "switch language" buttons
    [['EN', 'En', 1020], ['JP', 'Jp', 1110], ['KR', 'Kr', 1190]].forEach(item => {
        const languageButton = new PIXI.Text(item[0], new TextStyle({ fontSize: 50 }));
        languageButton.x = item[2];
        languageButton.y = 20;
        languageButton.interactive = true;
        languageButton.on('pointerdown', () => {
            menuContainer.locale = item[1];
            menuStack.forEach(menuScreen => {
                setAllButtonTexts(menuScreen.buttons, menuContainer.locale);
            })
        });
        setHoverAction(languageButton);
        container.addChild(languageButton);
    })

    pushMenuScreen(menuContainer, menuStack, menuData)
}

function pushMenuScreen(menuContainer, menuStack, menuData) {
    const menuScreen = {
        menu: menuData,
        container: new Scrollbox({ boxWidth: 1280, boxHeight: 720, overflowY: "auto"}),
        buttons: [],
    }

    // Hack to avoid horizontal alignment bug (content jumps to center upon scroll)
    var bg = new PIXI.Sprite();
    bg.width = menuScreen.container.boxWidth;
    bg.height = 1;
    menuScreen.container.content.addChild(bg);

    let offset = 10;

    if (menuStack.length > 0) {
        const back = new PIXI.Text("", new TextStyle({ fontSize: 30 }));
        back.x = 10;
        back.y = offset;
        back.interactive = true;

        menuScreen.buttons.push({
            button: back,
            locales: {
                En: "← Back",
                Jp: "← 戻る", 
            },
        })

        back.on('pointerdown', () => {
            popMenuScreen(menuContainer, menuStack);
        })

        menuScreen.container.content.addChild(back);
        offset += 50;
        
        setHoverAction(back);
    }

    menuScreen.menu.items.forEach((item, index) => {
        const text = item.Key ? menuText[item.Key].Jp : item.En;
        const label = new PIXI.Text(text, new TextStyle({ fontSize: 30 }));
        label.x = 10;
        label.y = offset;
        label.interactive = true;

        const localesForKey = item.Key ? menuText[item.Key] : null;
        const locales = localesForKey ? {
            En: localesForKey.En,
            Kr: localesForKey.Kr,
            Jp: localesForKey.Jp
        } : {
            En: item.En,
            Kr: item.Kr,
            Jp: item.Jp
        };

        if (menuScreen.menu.itemType === 'chapters') {
            Object.keys(locales).forEach(locale => {
                if (!locales[locale]) {
                    return;
                }
                if (locale === 'Jp') {
                    locales[locale] = '第' + (index + 1) + '章: ' + locales[locale];
                } else {
                    locales[locale] = 'Ch. ' + (index + 1) + ': ' + locales[locale];
                }
            })
        }
        if (menuScreen.menu.itemType === 'episodes') {
            Object.keys(locales).forEach(locale => {
                if (!locales[locale]) {
                    return;
                }
                locales[locale] = '#' + (index + 1) + ': ' + locales[locale];
            })
        }
        
        menuScreen.buttons.push({
            button: label,
            locales
        })

        
        label.on('pointerdown', () => {
            if (item.items) {
                pushMenuScreen(menuContainer, menuStack, item);
            }
        })
        
        menuScreen.container.content.addChild(label);
        offset += 50;

        setHoverAction(label);
    });
        
    // Update scrollbox
    menuScreen.container.update();

    setAllButtonTexts(menuScreen.buttons, menuContainer.locale);

    menuContainer.removeChildren();
    menuContainer.addChild(menuScreen.container);
    menuStack.push(menuScreen);
}

function popMenuScreen(menuContainer, menuStack) {
    menuStack.pop();
    menuContainer.removeChildren();
    menuContainer.addChild(menuStack[menuStack.length - 1].container);
}

function setButtonText(button, locale) {
    if (button.locales[locale]) {
        button.button.text = button.locales[locale];
    } else if (button.locales.En) {
        button.button.text = button.locales.En;
    } else if (button.locales.Jp) {
        button.button.text = button.locales.Jp;
    } else {
        button.button.text = button.locales[Object.keys(button.locales)[0]];
    }
}

function setAllButtonTexts(buttons, locale) {
    buttons.forEach(button => setButtonText(button, locale));
}

function setHoverAction(button) {
    let originalColor = button.style.fill;
    button.on('pointerover', () => {
        button.style.fill = 0xFFFFFF;
    })
    button.on('pointerout', () => {
        button.style.fill = originalColor;
    })
}