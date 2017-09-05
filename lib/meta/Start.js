const pathlib = require('path');
const { ModuleBase } = require('elmoed');

const { makeGlobalMenuTemplate } = require('../utils');
const dialogs = require('../utils/dialogs.js');
const Deck = require('../deck/Deck');

class Start extends ModuleBase {
    load(callback) {
        this.setupEvents();
        this.recent = dialogs.getRecentListData();
        this.setMenu();
        callback();
    }

    close() {
        // Close the current window
        this.windowInfo.browserWindow.close();
    }

    /*
      Sets up the global menu
    */
    setMenu() {
        const template = makeGlobalMenuTemplate(
            this.windowInfo,
            this.manager,
            process.cwd(),
        );

        // once we're loaded, setup a nice menu
        const { Menu } = this.manager.electron;
        this.globalMenu = Menu.buildFromTemplate(template);

        // Set this as the global menu bar
        Menu.setApplicationMenu(this.globalMenu);
        this.windowInfo.browserWindow.setMenuBarVisibility(true);
    }

    setupEvents() {
        this.on('ready', () => {
        });

        this.on('menu_open', () => {
            dialogs.loadDeck(this.manager, process.cwd(), () => {
                this.close();
            });
        });

        this.on('menu_import', () => {
            dialogs.importDirectory(this.manager, process.cwd(), () => {
                this.close();
            });
        });

        this.on('menu_new', () => {
            dialogs.newDeck(this.manager, process.cwd(), () => {
                this.close();
            });
        });

        this.on('open_recent', (ev, filepath) => {
            this.manager.createWindow(filepath, () => {
                this.close();
            });
        });
    }

    getProps() {
        return {
            recentDecks: this.recent.map(({ path, data }) => {
                const slides = Deck.layoutDeckPreview(
                    this.manager,
                    data.slide.slice(0, 3),
                );
                const filename = pathlib.basename(path);
                return { path, slides, filename };
            }).slice(0, 3),
        };
    }
}

module.exports = Start;
