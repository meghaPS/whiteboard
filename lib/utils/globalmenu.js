const dialogs = require('./dialogs');
const { glyphIcon } = require('./utils.js');

const NOOP = () => {};

let _recentSubmenu = null;

function makeGlobalMenuTemplate(
    windowInfo,
    manager,
    defaultPath,
    topLevelExtras = [],
    fileMenuExtras = [],
    helpExtras = [],
) {
    if (fileMenuExtras.length > 0) {
        // Add a separator after
        fileMenuExtras.unshift({ type: 'separator' });
    }


    // First time generating recent menu list
    if (_recentSubmenu === null) {
        _recentSubmenu = [];
        for (const { path, name } of dialogs.getRecentList()) {
            _recentSubmenu.push({
                label: name,
                click: () => {
                    manager.createWindow(path, NOOP);
                },
            });
        }
    }

    return [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New...',
                    icon: glyphIcon('document-plus'),
                    click: () => {
                        dialogs.newDeck(manager, defaultPath, NOOP);
                    },
                },
                {
                    label: 'Import from directory...',
                    icon: glyphIcon('folder-search'),
                    click: () => {
                        dialogs.importDirectory(manager, defaultPath, NOOP);
                    },
                },
                { type: 'separator' },
                {
                    label: 'Open...',
                    icon: glyphIcon('folder-open'),
                    click: () => {
                        dialogs.loadDeck(manager, defaultPath, NOOP);
                    },
                },
                {
                    label: 'Recent',
                    submenu: _recentSubmenu,
                    enabled: _recentSubmenu.length > 1,
                },
                ...fileMenuExtras,
                { type: 'separator' },
                {
                    label: 'Quit',
                    icon: glyphIcon('door'),
                    click: () => {
                        const { browserWindow } = windowInfo;
                        browserWindow.close();
                    },
                },
            ],
        },
        ...topLevelExtras,
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Debugging tools',
                    submenu: [
                        {
                            role: 'toggledevtools',
                        },
                    ],
                },
                { type: 'separator' },
                ...helpExtras,
                {
                    label: 'About',
                    icon: glyphIcon('circle-help'),
                    click: () => {
                        dialogs.showAboutWindow(manager, windowInfo);
                    },
                },
            ],
        },
    ];
}

module.exports = {
    makeGlobalMenuTemplate,
};