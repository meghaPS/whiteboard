/* eslint-disable global-require */
const { mockElectron, mockWindowManager } = require('elmoed').testutils;
const mockery = require('mockery');
const { mockObject, mockMethod } = require('magicmock');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'support', 'data', 'deck');
const TWO_SLIDES = path.resolve(DATA_DIR, 'twoslides.whiteboard');
// Mostly just a stub of integrat-y unit tests for Slide

describe('Deck', () => {
    let electron = null;
    let Deck = null;
    let manager = null;
    let modules = null;
    beforeEach(() => {
        electron = mockElectron();
        mockery.enable();
        mockery.registerMock('electron', electron);
        mockery.registerMock('mousetrap', mockObject());
        mockery.warnOnUnregistered(false);

        // Now actually pull in Deck
        Deck = require('../../lib/deck/Deck');
        // const Slide = require('../../lib/deck/Slide');
        ({ electron, manager, modules } = mockWindowManager('whiteboard', Deck));
        mockery.registerMock('electron', electron);

        // Mock up a couple editors
        const { ModuleBase } = require('elmoed');
        modules.slide = {
            module: class TestSlide extends ModuleBase {},
            edits: ['!slide'],
        };
        modules.title = {
            module: class TestTitle extends ModuleBase {},
            edits: ['!title'],
        };
    });

    describe('when opening an empty file', () => {
        let deck = null;
        beforeEach((done) => {
            manager.createWindow('noexist.whiteboard', (newDeck) => {
                deck = newDeck;
                done();
            }, { creating: true });
        });

        it('sets up a menu', () => {
            const menu = electron._getMockedMenu();
            expect(menu).toBeTruthy();
        });

        it('when opening up', () => {
            expect(deck.slideIDs.length).toEqual(1);
            expect(deck.activeSlideID).toBeTruthy();
            expect(Object.keys(deck.slideData).length).toEqual(1);
            expect(Object.keys(deck.slideEditors).length).toEqual(1);
        });

        afterEach(() => {
            deck = null;
        });
    });

    describe('when opening a typical slide deck', () => {
        let deck = null;
        beforeEach((done) => {
            manager.createWindow(TWO_SLIDES, (newDeck) => {
                deck = newDeck;
                done();
            });
        });

        afterEach(() => {
            deck = null;
        });

        it('sets up a menu', () => {
            const menu = electron._getMockedMenu();
            expect(menu).toBeTruthy();
        });

        xit('sets up two slides', () => {
            expect(deck.slideIDs.length).toEqual(2);
            expect(deck.activeSlideID).toBeTruthy();
            expect(Object.keys(deck.slideData).length).toEqual(2);
            expect(Object.keys(deck.slideEditors).length).toEqual(1);
        });

        it('deletes an inactive slide', () => {
            const _fs = [deck.activeSlideID];
            deck.setFewerSlides(_fs);
            expect(deck.activeSlideID).toBeTruthy();
            expect(Object.keys(deck.slideData).length).toEqual(1);
            expect(Object.keys(deck.slideEditors).length).toEqual(1);
            expect(deck.slideIDs.length).toEqual(1);
        });

        it('deletes an active slide', () => {
            const editor = deck.slideEditors[deck.slideIDs[0]];
            editor.onWindowClosed = mockMethod();
            const _fs = [deck.slideIDs[1]];
            deck.setFewerSlides(_fs);
            expect(deck.activeSlideID).toBeTruthy();
            expect(Object.keys(deck.slideData).length).toEqual(1);
            expect(Object.keys(deck.slideEditors).length).toEqual(1);
            expect(deck.slideIDs.length).toEqual(1);
            expect(editor.onWindowClosed.called()).toEqual(true);
        });

        it('deletes all slides and replaces with placeholder', () => {
            deck.setFewerSlides([]);
            expect(deck.activeSlideID).toBeTruthy();
            expect(Object.keys(deck.slideData).length).toEqual(1);
            expect(Object.keys(deck.slideEditors).length).toEqual(1);
            expect(deck.slideIDs.length).toEqual(1);
        });

        it('correctly calls onWindowClosed of subeditors', () => {
            const editors = Object.values(deck.slideEditors);
            for (const editor of editors) {
                editor.onWindowClosed = mockMethod();
            }
            deck.onWindowClosed();
            for (const editor of editors) {
                expect(editor.onWindowClosed.called()).toEqual(true);
            }
        });
    });



    afterEach(() => {
        manager = null;
        electron = null;
        Deck = null;
        mockery.deregisterAll();
        mockery.disable();
    });
});

