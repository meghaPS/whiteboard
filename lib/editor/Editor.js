'use strict';

const {ModuleBase} = require('elmoed');

const glob = require('glob');
const fs = require('fs');
const pathlib = require('path');

function split_text(text) {
    text = text.trim();
    if (text.includes('\n')) {
        // Split by newline
        return text.split('\n').map(s => s.trim());
    } else if (text.includes(',')) {
        // Split by comma
        return text.split(',').map(s => s.trim());
    } else if (text.length > 0) {
        // Just return single element
        return [text];
    } else {
        // Empty string = empty list
        return [];
    }
}

const _make_default_empty = () => ({
    path: 'NEW',
    text: '',
    edited: false,
    _default: true,
});

class Editor extends ModuleBase {
    constructor(...args) {
        super(...args);
        this.tabs = null;
        this.active_file_path = null;
        this.font_size = 18;
    }

    load(callback, text) {
        // Already loaded
        if (this.tabs !== null) {
            callback();
            return;
        }

        // Converts the text into a list of files, some of which might
        // be globs. These it attempts to resolve and put all in paths.
        const file_list = split_text(text);
        const globs = file_list.filter(glob.hasMagic);
        const normal_paths = file_list.filter(path => !glob.hasMagic(path));
        const globbed_paths = globs.map(
            gpath => glob.sync(gpath.trim(), {nodir: true}));
        const all_paths = Array.prototype.concat.apply(normal_paths, globbed_paths);

        this.setup_events();
        this.tabs = [];
        this.add_tabs(all_paths, callback);
    }

    add_tabs(paths, callback) {
        // "empty state" of just a single empty placeholder tab
        if (this.tabs.length === 1
                && this.tabs[0]._default
                && this.tabs[0].text.length < 1) {
            this.active_file_path = null; // reset active file
            this.tabs = [];
        }

        // Remove existing versions of tabs (in the case of dupes)

        // TODO: make async
        this.tabs = this.tabs.concat(paths.map(partial_path => {
            const path = pathlib.resolve(partial_path.trim());
            let text = '';
            if (fs.existsSync(path)) {
                text = fs.readFileSync(path).toString();
            }
            return {path, text, edited: false};
        }));

        // Ensure we never have an empty tab list
        if (this.tabs.length === 0) {
            this.tabs = [_make_default_empty()];
        }

        // If nothing is open, auto-open first thing
        if (this.active_file_path === null) {
            this.active_file_path = this.tabs[0].path;
        }
        callback();
    }

    setup_events(match) {
        this.on('change_tab', (event, updated_text, current_path, new_path) => {
            if (current_path !== this.active_file_path) {
                // Shouldn't happen any more, but just in case leaving
                // this in here
                console.error('MISMATCH!', current_path, this.active_file_path);
                this.active_file_path = current_path;
            }
            this.set_text(this.active_file_path, updated_text);
            this.active_file_path = new_path;
            this.update();
        });

        this.on('save', (event, updated_text) => {
            this.save_text(this.active_file_path, updated_text);
        });

        this.on('saveas', (event, updated_text) => {
            this.change_active_file_path(() => {
                this.save_text(this.active_file_path, updated_text);
                this.update();
            });
        });
    }

    save_text(path, new_text) {
        // Saves the given path with the new text
        const active_file = this.get_file(path);
        active_file.edited = false;
        active_file.text = new_text;
        fs.writeFile(active_file.path, new_text, err => {
            if (err) {
                console.error('error writing file: ', err);
            }
        });
    }

    close_tab() {
        // Saves the given path with the new text
        this.tabs = this.tabs.filter(({path}) => path !== this.active_file_path);
        if (this.tabs.length === 0) {
            this.tabs = [_make_default_empty()];
        }
        this.active_file_path = this.tabs[0].path;
        this.update()
    }

    open_files() {
        const {dialog} = this.manager.electron;
        dialog.showOpenDialog({
            title: 'Open new tab(s)...',
            properties: ['openFile', 'multiSelections'],
        }, file_paths => {
            if (!file_paths) {
                return; // Canceled
            }
            this.add_tabs(file_paths, () => this.update());
        });
    }

    change_active_file_path(callback) {
        const {dialog} = this.manager.electron;
        dialog.showSaveDialog({
            defaultPath: this.active_file_path,
        }, new_path => {
            if (!new_path) {
                return; // Canceled
            }
            // Reassigns the path
            const active_file = this.get_file(this.active_file_path);
            active_file.path = new_path;
            this.active_file_path = new_path;
            callback();
        });
    }

    get_context_menu() {
        const font_size_submenu = number => ({
            label: `${number} pt`,
            type: 'radio',
            click: () => {
                this.font_size = number;
                this.update();
            },
            checked: this.font_size === number,
        });
        return [
            {
                label: 'Font Size',
                submenu: [
                    font_size_submenu(11),
                    font_size_submenu(14),
                    font_size_submenu(18),
                    font_size_submenu(24),
                    font_size_submenu(32),
                ],
            },
            {
                label: 'Save',
                accelerator: 'CommandOrControl+S',
                click: () => this.send('trigger_save'),
            },
            {
                label: 'Save as...',
                accelerator: 'CommandOrControl+Shift+S',
                click: () => this.send('trigger_save_as'),
            },
            {
                label: 'Open file(s)...',
                accelerator: 'CommandOrControl+O',
                click: () => this.open_files(),
            },
            {
                label: 'Close tab',
                accelerator: 'CommandOrControl+W',
                click: () => this.close_tab(),
            },
        ];
    }

    set_text(path, new_text) {
        const active_file = this.get_file(path);
        active_file.edited = true;
        active_file.text = new_text;
    }

    get_file(path) {
        const file = this.tabs.find(file => file.path === path);
        if (!file) {
            console.error('Cannot find file ', path);
        }
        return file;
    }

    get_active_file_text() {
        return this.get_file(this.active_file_path).text;
    }

    static get_iconic_preview(text) {
        return '<img src="svg/si-glyph-code.svg"/>';
    }

    getProps() {
        const tabs = this.tabs
            .map(file => ({
                title: pathlib.basename(file.path),
                path: file.path,
                active: file.path === this.active_file_path,
            }));
        const path = this.active_file_path;
        const text = this.get_active_file_text();
        const {font_size} = this;
        return {path, tabs, text, font_size};
    }
}

module.exports = Editor;