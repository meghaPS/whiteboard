const { ModuleBase } = require('elmoed');

const dialogs = require('../dialogs');
const Deck = require('../deck/Deck');

class Start extends ModuleBase {
    load(callback) {
        this.setup_events();
        this.recent = dialogs.get_recent_list();
        callback();
    }

    close() {
        // Close the current window
        this.windowInfo.browserWindow.close();
    }

    setup_events() {
        this.on('ready', () => {
        });

        this.on('menu_open', () => {
            dialogs.load_deck(this.manager, process.cwd(), () => {
                this.close();
            });
        });

        this.on('menu_import', () => {
            dialogs.import_directory(this.manager, process.cwd(), () => {
                this.close();
            });
        });

        this.on('menu_new', () => {
            dialogs.new_deck(this.manager, process.cwd(), () => {
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
                const slides = Deck.layout_deck_preview(
                    this.manager,
                    data.slide.slice(0, 3),
                );
                return { path, slides };
            }).slice(0, 3),
        };
    }
}

module.exports = Start;