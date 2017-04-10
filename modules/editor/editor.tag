<editor>
    <style scoped>
        .aceeditor-wrapper {
            height: 500px;
        }

        .editor-wrapper {
            height: 100%;
        }

        .editor-wrapper .card-content {
            height: 100%;
        }
        .editor-wrapper ul.tabs,
        .editor-wrapper ul.tabs a {
            cursor: default;
            text-transform: none;
        }

        .upper-right-button {
            bottom: 5px;
            right: 0px;
            position: absolute;
        }
    </style>


    <div class="editor-wrapper card deep-purple darken-4 z-depth-4">
        <div class="card-content white-text">
            <ul class="tabs deep-purple darken-4 white-text">
                <li class="tab col {parent.opts.tab_col_class} " each={opts.tabs}>
                    <a onclick={change_tab} class="{active: active} deep-purple {white-text: !active} {darken-4: !active} {lighten-4: active} {black-text: active}">{title}</a>
                </li>
                <!--
                <a onclick={do_save} class="btn-floating waves-effect waves-light deep-purple upper-right-button">
                    <i class="large mdi-content-save"></i>
                </a>
                -->
            </ul>
            <div name='editor_node'></div>
        </div>
    </div>


    <script>
        'use strict';
        require('../../node_modules/javascript-detect-element-resize/detect-element-resize');

        setup_editor() {
            const modelist = ace.require("ace/ext/modelist")
            if (!this.editor) {
                this.editor = ace.edit(this.editor_node);
            }

            if (this.opts.text != this.editor.getValue()) {
                this.editor.setValue(this.opts.text, 1);
            }
            this.editor.setTheme("ace/theme/monokai");
            this.editor.setOptions({fontSize: "18pt"});
            const mode = modelist.getModeForPath(this.opts.path).mode
            this.editor.getSession().setMode(mode);
            this.editor_node.style.height = '95%'; // TODO FIX
            this.editor.resize();

            // Whenever the container resizes, make the term fit
            window.addResizeListener(this.editor_node, () => {
                this.editor_node.style.height = '95%'; // TODO FIX
                this.editor.resize();
            });
        }

        change_tab(ev) {
            ev.preventUpdate = true;
            const {active, path} = ev.item;
            this.opts.send('change_tab', this.editor.getValue(), path);
            if (active) {
                // already active, do nothing
            } else {
                this.opts.send('activate', path);
            }
        }

        do_save(ev) {
            if (ev) {
                ev.preventUpdate = true;
            }
            this.opts.send('save', this.editor.getValue());
        }

        this.on('mount', () => {
            this.setup_editor();
            this.opts.on_ipc('trigger_save', () => this.do_save());
        });

        this.on('update', () => {
            const tabs = this.opts.tabs || ['dummy'];
            const len = Math.floor(12 / (tabs.length || 1));
            const MIN = 1;
            const MAX = 4;
            const col_width = Math.max(Math.min(len, MAX), MIN);
            this.opts.tab_col_class = `s${col_width}`;
        });

        this.on('updated', () => {
            if (this.opts.text != this.editor.getValue()) {
                // update text
                this.editor.setValue(this.opts.text, 1);

                // update syntax highlight mode
                const modelist = ace.require("ace/ext/modelist")
                const mode = modelist.getModeForPath(this.opts.path).mode
                this.editor.getSession().setMode(mode);
            }
        });
    </script>
</editor>