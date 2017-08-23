<wb-browser>
    <style scoped>
        webview {
            width: 100%;
            height: 100%;
        }
        .browser-wrapper {
            width: 100%;
            height: 100%;
            position: relative;
        }

        .browser-404, .browser-loading {
            display: block;
            top: 0;
            width: 100%;
            position: absolute;
            text-align: center;
            min-height: 110px;
        }
        .browser-404 x-button, .browser-404 x-input {
            display: inline-block;
        }
        .browser-404 x-button {
            width: 10%;
        }
        .browser-404 x-input {
            width: 80%;
        }
    </style>

    <div class="browser-wrapper">
        <webview ref="webview" src="{opts.url}"></webview>

        <x-card  ref="error404" class="browser-404" style="display: none">
            <main>
                <h2 if={opts.url != 'new browser'}>Error: Failed to load</h2>
                <x-input ref="addressbar" type="url" value="{opts.url}">
                </x-input>
                <x-button onclick={trigger_navigate}>
                    Go
                </x-button>
            </main>
        </x-card>

        <x-card  ref="browserloading" class="browser-loading" style="display: none">
            <main>
                Loading...
                <x-throbber></x-throbber>
            </main>
        </x-card>

    </div>

    <script>
        'use strict';
        // Essential: Prevent default update in browser
        /*this.on('update', ev => {
            console.log('getting updated!');
            ev.preventUpdate = true;
        });
        */

        trigger_navigate(ev) {
            ev.preventUpdate = true;
            const {webview, addressbar} = this.refs;
            this.opts.send('navigation_force', addressbar.value);
        }

        function clear_errors() {
            const error_tags = document.querySelectorAll('.browser-404, .browser-loading');
            for (const error_tag of error_tags) {
                error_tag.style.display = 'none';
            }
        }

        function load_start() {
            const {browserloading} = this.refs;
            clear_errors();
            browserloading.style.display = 'block';
        }

        function load_commit() {
            clear_errors();
            const {webview} = this.refs;
            this.opts.send('navigation', webview.getURL());
        }

        function load_fail() {
            clear_errors();
            const {webview, error404, addressbar} = this.refs;
            error404.style.display = 'block';
            let url = webview.getURL()
            if (url === 'new browser' || addressbar.value === 'new browser') {
                url = 'http://google.com/'; // default to google
            }
            addressbar.value = url;
        }

        this.on('mount', () => {
            const {webview} = this.refs;
			webview.addEventListener('load-commit', load_commit.bind(this));
			webview.addEventListener('did-start-loading', load_start.bind(this))
			webview.addEventListener('did-fail-load', load_fail.bind(this));
        });

    </script>
</wb-browser>
