'use strict';
const lodash = require('lodash');

const {ModuleBase} = require('elmoed');

let id = 0;
function _uid() {
    id++;
    return id;
}

const HORIZONTAL_LAYOUT = 'horizontal';
const VERTICAL_LAYOUT = 'vertical';
const GRID_LAYOUT = 'grid';

const nonPanular = new Set([
    // Meta information about the pane:
    'layout',
    'maximized_pane',
]);

// Size of 'prefer_top' panes, currently only the Title
const TOP_PANE_SIZE = 10;
const TOP_PANE_PREVIEW_SIZE = 60;

const NEW_SLIDE_TEXT = 'New Slide ';

// TODO: Add more complete modular registration listing to Elmoed manager
const PANE_MODS = new Set([
    'terminal',
    'editor',
    'title',
    // 'rawhtml',
    'markdown',
]);
const is_pane = PANE_MODS.has.bind(PANE_MODS);

let new_slide_count = 1;
function _guess_new_slide_count(info) {
    if (!info.title || !info.title.startsWith(NEW_SLIDE_TEXT)) {
        return;
    }
    let v = Number(info.title.slice(NEW_SLIDE_TEXT.length));

    if (Number.isFinite(v) && v >= new_slide_count) {
        new_slide_count = v + 1;
    }
}

class Slide extends ModuleBase {
    constructor(...args) {
        super(...args);

        // Setup each pane sub-editor
        this.panes = [];
        this.pane_editors = {};
        this._pane_maximized = false;
        this._needs_remount = false;
        this.info = null;
    }

    // Creates new slide info, defaulting to empty
    static new_slide_info() {
        return {title: `${NEW_SLIDE_TEXT}${new_slide_count}`};
    }

    // Given slide info object, lays out the panes.
    static layout_pane_previews(manager, info) {
        _guess_new_slide_count(info);
        const panes = [];
        for (const typename of Object.keys(info)) {
            if (nonPanular.has(typename)) {
                continue; // Skip meta-info like layout
            }

            // Construct a pane info object to be used by the front-end in
            // setting up all the panes
            const editor_class = manager.getEditorClass(typename);
            const preview = Slide.get_preview(editor_class, info[typename]);
            const hint = editor_class.layout_hint || {};
            panes.push({hint, preview});
        }
        const layout = info.layout || HORIZONTAL_LAYOUT;
        return Slide.layout_rows(layout, panes, TOP_PANE_PREVIEW_SIZE);
    }

    static get_preview(editor_class, placeholder) {
        return editor_class.get_iconic_preview
            ? editor_class.get_iconic_preview(placeholder)
            : Slide.get_default_iconic_preview(placeholder);
    }

    static layout_rows(layout, panes, top_pane_size = TOP_PANE_SIZE) {
        const rows = [];

        // First, float up all prefer_top
        const top_panes = panes.filter(pane => pane.hint.prefer_top);
        const normal_panes = panes.filter(pane => !pane.hint.prefer_top);

        let top_row_class;
        let row_class;
        let v_realestate = 100;
        let h_realestate = 100;

        // Divide evenly by top_panes if there are no normal panes
        if (normal_panes.length < 1) {
            top_pane_size = v_realestate / top_panes.length;
        }

        // Remove top rows and give them their fixed 10% height
        for (const pane of top_panes) {
            v_realestate -= top_pane_size;
            rows.push({
                width: h_realestate,
                height: top_pane_size,
                row_panes: [pane],
            });
        }

        // No normal panes? Return now...
        if (normal_panes.length === 0) {
            return rows;
        }

        // Now divide the rest (V or H), or do 2 at a time (Grid)
        const make_row = (height, row_panes) => {
            const width = h_realestate / row_panes.length;
            return {height, width, row_panes};
        };

        if (layout === VERTICAL_LAYOUT) {
            // adds all normal panes in one row
            rows.push(make_row(v_realestate, normal_panes));
        } else if (layout === HORIZONTAL_LAYOUT) {
            // Adds each pane in a separate row.
            // Calc row height, and push all the rows
            const row_height = v_realestate / normal_panes.length;
            rows.push(...normal_panes.map(pane => ({
                width: h_realestate,
                height: row_height,
                row_panes: [pane],
            })));
        } else {
            // Grid layout
            const row_count = Math.ceil(normal_panes.length / 2);
            const height = v_realestate / row_count;
            while (normal_panes.length > 0) {
                const row_panes = [normal_panes.shift()];
                if (normal_panes.length > 0) {
                    row_panes.push(normal_panes.shift());
                }
                rows.push(make_row(height, row_panes));
            }
        }
        return rows;
    }

    load(callback, info) {
        if (!this.info) {
            // not yet loaded
            this.info = info;
            this.panes = this._make_pane_info(this.path, this.info);
            this.setup_events();
        }
        callback();
    }

    // Given a path and the parsed info from a single Slide, return an
    // flat of array of objects in the expected format (e.g. with
    // 'typename' for each one)
    _make_pane_info(path, slide_info) {
        const panes = [];
        for (const typename of Object.keys(slide_info)) {
            if (nonPanular.has(typename)) {
                continue; // Skip meta-info like layout
            }

            // Construct a pane info object to be used by the front-end in
            // setting up all the panes
            const text = slide_info[typename];
            const path = this.getSubPath(typename);
            const editor_class = this.manager.getEditorClass(typename);
            const mount_id = `pane_${_uid()}`;
            const hint = editor_class.layout_hint || {};
            panes.push({hint, mount_id, typename, path, text});
        }
        return panes;
    }

    static get_default_iconic_preview(type) {
        return `<span class='slide-preview-default'>${type}</span>`;
    }

    mount_panes() {
        // Using the Editor mounting system, loop through mounting all
        // panes with their individual modules
        for (const pane of this.panes) {
            const pane_editor = this.subMount(pane.path, `#${pane.mount_id}`, () => {}, pane.text);
            this.pane_editors[pane.mount_id] = pane_editor;
        }
    }

    remount_pane_by_typename(typename, value) {
        // TODO: This function doesn't work, sadly. It's supposed to remount a single pane.
        const pane = this.panes.find(pane => pane.typename === typename);
        pane.text = value;
        const pane_editor = this.subMount(pane.path, `#${pane.mount_id}`, () => {}, pane.text);
        this.pane_editors[pane.mount_id] = pane_editor;
    }

    setup_events() {
        this.on('ready', (event, payload) => {
            this.mount_panes();
        });

        this.on('change_focus', (event, mount_id) => {
            let pane_menu = [];
            const editor = this.pane_editors[mount_id];
            if (editor && editor.get_context_menu) {
                pane_menu = editor.get_context_menu();
            }
            this.set_menu(pane_menu, editor);
        });

        this.on('edit_panel_save', (event, payload) => {
            const {value, typename} = payload;
            this.info[typename] = value;
            this.remount_pane_by_typename(typename, value);
            // this.panes = this._make_pane_info(this.path, this.info);
            // TODO: this isn't working
        });

        // When we redo the layout, this gets triggered when the backend is
        // done
        this.on('remount_editors', this.mount_panes.bind(this));
    }

    delete_pane(typename) {
        delete this.info[typename];
        this.panes = this._make_pane_info(this.path, this.info);
        this._needs_remount = true;
        this.update();
        this._needs_remount = false;
    }

    edit_pane(typename) {
        const value = this.info[typename];
        this.send('edit_pane', {value, typename});
    }

    add_pane(typename) {
        this.info[typename] = 'new ' + typename;
        this.panes = this._make_pane_info(this.path, this.info);
        this._needs_remount = true;
        this.update();
        this._needs_remount = false;
    }

    /*
     * Sets the context + global menu with given prepended menu
     */
    set_menu(prepend_menu = [], editor = null) {
        const does_not_have = key => !(key in this.info);
        const mods = Object.keys(this.manager.modules)
            .filter(is_pane).filter(does_not_have);
        const types_submenu = mods.map(typename => {
            const editor_class = this.manager.getEditorClass(typename);;
            const label = editor_class.verbose_name || lodash.startCase(typename);
            return {
                label: label,
                click: () => this.add_pane(typename),
            };
        });

        let pane_menu = [];
        if (editor) {
            // TODO Fix this, add "reverse type name" to Elmoed:
            const splitted = editor.path.split('!');
            const name = splitted[splitted.length - 1];

            pane_menu = [
                {
                    label: 'Maximize ' + name,
                    accelerator: 'F10',
                    type: 'checkbox',
                    checked: !!this.maximized_pane,
                    click: () => {
                        this.toggle_maximize(name);
                    },
                },
                {
                    label: `Modify ${name}`,
                    submenu: [
                        {
                            label: `Edit ${name}`,
                            click: () => this.edit_pane(name),
                        },
                        {
                            label: `Remove ${name}`,
                            click: () => this.delete_pane(name),
                        },
                    ]
                },
            ];
        }

        const template = [
            ...prepend_menu,
            ...pane_menu,
            {type: 'separator'},
            {
                label: 'Add pane',
                submenu: types_submenu,
            },
            {
                label: 'Layout',
                submenu: [
                    {
                        label: '\u268C Horizontal',
                        type: 'radio',
                        click: () => this.set_layout(HORIZONTAL_LAYOUT),
                        checked: this.layout === HORIZONTAL_LAYOUT,
                    },
                    {
                        label: '\u2016 Vertical',
                        type: 'radio',
                        click: () => this.set_layout(VERTICAL_LAYOUT),
                        checked: this.layout === VERTICAL_LAYOUT,
                    },
                    {
                        label: '\u268F Grid',
                        type: 'radio',
                        click: () => this.set_layout(GRID_LAYOUT),
                        checked: this.layout === GRID_LAYOUT,
                    },
                ],
            },
        ];
        this.parentEditor.set_menu(template);
    }

    get layout() {
        return this.info.layout || HORIZONTAL_LAYOUT;
    }

    get maximized_pane() {
        return this.info.maximized_pane || null;
    }

    get slide_data() {
        return this.info; // for now requires no prepping
    }

    toggle_maximize(typename) {
        if (this.maximized_pane) {
            // Already maximized, de maximize
            delete this.info.maximized_pane;
            this.send('unmaximize_pane');
        } else {
            this.info.maximized_pane = typename;
            this.send('maximize_pane', typename);
        }
    }

    set_layout(new_layout) {
        this.info.layout = new_layout;

        // Needs to update, and the frontend needs to know that we need
        // a remount after this one
        this._needs_remount = true;
        this.update();
        this._needs_remount = false;
    }

    getProps() {
        return {
            _needs_remount: this._needs_remount,
            /*panes: this.panes,*/
            pane_rows: Slide.layout_rows(this.layout, this.panes),
            layout_name: String(this.layout),
            maximized_pane: this.maximized_pane,
        };
    }
}

module.exports = Slide;