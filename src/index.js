import fp from 'lodash/fp';
import { createStore, applyMiddleware } from 'redux';
import { render, Component } from 'preact';
import { createElement as h } from 'preact-hyperscript';
import { Provider, connect } from 'preact-redux';
import linkState from 'linkstate';
import cuid from 'cuid';

import './index.css';

// -------------- State ---------------- //
const createAction = (type, payload) => ({ type, payload });
const defaultState = {
	events: [],
	simpleEventInput: 'TEST',
};
const RECORD_EVENT = 'LifeTracker:RECORD_EVENT';
const recordEvent = name => createAction(RECORD_EVENT, { name, at: Date.now() });

const DOWNLOAD_DATA = 'LifeTracker:DOWNLOAD_DATA';
const downloadData = () => createAction(DOWNLOAD_DATA);

const DELETE_DATA = 'LifeTracker:DELETE_DATA';
const deleteData = () => createAction(DELETE_DATA);

const SET_EVENT_TEXT = 'LifeTracker:SET_EVENT_TEXT';
const setEventText = (text) => createAction(SET_EVENT_TEXT, text);

const reducer = (state = defaultState, action) => {
	switch (action.type) {
		case RECORD_EVENT:
			return {
				...state,
				events: state.events.concat(action.payload),
			};

		case DELETE_DATA: {
			return {
				...state,
				events: [],
			};
		}

		case SET_EVENT_TEXT:
			return {
				...state,
				simpleEventInput: action.payload,
			};


		default:
			console.log('Unhandled', action);
			return state;
	}
};

const PERSIST_KEY = 'life-tracker-storage';
const initialState = (() => {
	const persist = window.localStorage.getItem(PERSIST_KEY);
	if (persist) {
		return JSON.parse(persist);
	}
	return undefined;
})();
let shouldSave = false;
const store = createStore(reducer, initialState, applyMiddleware(
	// @todo: persistence
	() => next => action => {
		shouldSave = true;
		return next(action);
	},
	// @todo: redux-logger
	({ getState }) => next => action => {
		const before = getState();
		let res;
		let isError = false;
		try {
			res = next(action);
		} catch (error) {
			res = error;
			isError = true;
		}
		const after = getState();
		console.groupCollapsed(`[${isError ? 'ERROR' : 'EVENT'} ${new Date().toISOString()}] ${action.type}`);
		console.log(before);
		console.log(action);
		console.log(after);
		console.groupEnd();
		return res;
	},
	// DOWNLOAD
	({ getState }) => next => action => {
		if (action.type !== DOWNLOAD_DATA) {
			return next(action);
		}

		// Just consume. Never call next on this one.
		const a = document.createElement('a');
		const file = new Blob([JSON.stringify(getState().events)], { type: 'application/json' });
		const url = URL.createObjectURL(file);
		a.href = url;
		a.download = 'life-tracker.json';
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		});
	})
);
setInterval(() => {
	if (shouldSave) {
		window.localStorage.setItem(PERSIST_KEY, JSON.stringify(store.getState()));
	}
}, 15 * 1000);

// -------------- Presentation ---------------- //
// Helper to set a path
const updatePath = (path) => (ctrl, evt) => ctrl.setState(fp.set(path, evt.target.value, {}));




// -------------------- Presentation Cimponents ----------------- //
const TextInput = ({
	id = `anon-text-${cuid()}`,
	label,
	...inputArgs,
} = {}) => h('div.form-field', [
	label ? h('label', { for: 'add-field-name' }, 'New Field Name') : undefined,
	h('input', { id, type: 'text', ...inputArgs }),
]);


// --------------------- Simple Event -- phase 1 --------------- //
class SimpleEvent extends Component {
	constructor(props){
		super(props);
		this.state = {
			event: props.event,
		};
	}

	canSubmitEvent({ event } = {}) {
		return !!event;
	}

	componentWillReceiveProps(nextProps, nextState) {
		if (nextProps.event !== this.state.event) {
			this.setState({
				event: nextProps.event,
			});
		}
	}

	render({ addEvent } = {}) {
		const {
			event = '',
		} = this.state;

		return h('section.simple-event', [
			h('h3', 'Record Event'),
			h('div.flex-row', [
				TextInput({
					label: 'event',
					value: event,
					onInput: linkState(this, 'event'),
				}),
				h('button', {
					disabled: !this.canSubmitEvent(this.state),
					onClick: () => addEvent(event),
				}, 'Add Record'),
			])
		]);
	}
}

// And now feed the SimpleEvent form the redux container
const LinkedSimpleEvent = connect(
	({
		simpleEventInput,
	}) => ({
		event: simpleEventInput,
	}),
	(dispatch) => ({
		addEvent: (evt) => dispatch(recordEvent(evt)),
	}),
)(SimpleEvent);





// --------------------- ADMIN TOOLS --------------- //
const AdminTools = ({
	eventsBarData, // { label: String, count: Number }[]
	eventsByHour, // { hour: 0-23, data: { label: String, count: Number }[] }[]
	downloadData, // () => {}, callback to fire
	deleteData, // () => {}, callback to fire
	setEventText, // (name: String) => {}
}) => h('section.admin-tools', [
	h('h3', ['Admin Tools']),
	h('section.data-sets', [
		h('button', {
			onClick: downloadData,
		}, [
			'Download Data (json blob)'
		]),
		h('h4', 'Events'),
		h('ul', [
			...eventsBarData.map(pt => h('li', [
				h('a.btn', {
					onClick: () => setEventText(pt.label),
				}, [
					pt.label,
				]),
				`: ${pt.count}`
			])),
		]),
		h('h4', 'Grouped By Hour'),
		h('ul', [
			...eventsByHour.map(pt => h('li', [
				`${pt.hour}:`,
				h('ul', [
					...pt.data.map(sub_pt => h('li', [
						`${sub_pt.label}: ${sub_pt.count}`,
					])),
				])
			])),
		]),
		h('div.danger-zone', [
			h('h4', 'Danger Zone'),
			h('button.danger', {
				onClick: deleteData,
			}, [
				'Delete Data',
			]),
		]),
	]),
]);

const countByProp = prop => fp.flow(
	fp.groupBy(prop),
	fp.mapValues(group => group.length),
	fp.toPairs,
	fp.sortBy(x => -x[1])
);

const LinkedAdminTools = connect(
	(state) => ({
		eventsBarData: fp.flow(
			countByProp('name'),
			fp.map(pair => ({ label: pair[0], count: pair[1] }))
		)(state.events),

		eventsByHour: fp.flow(
			fp.groupBy(x => (new Date(x.at)).getHours()),
			fp.mapValues(fp.flow(
				countByProp('name'),
				fp.map(pair => ({ label: pair[0], count: pair[1] }))
			)),
			fp.toPairs,
			fp.sortBy(x => +x[0]),
			fp.map(pair => ({ hour: pair[0], data: pair[1] })),
		)(state.events),
	}),
	(dispatch) => {
		return {
			setEventText: (...args) => dispatch(setEventText(...args)),
			downloadData: (...args) => dispatch(downloadData(...args)),
			deleteData: (...args) => dispatch(deleteData(...args)),
		};
	},
)(AdminTools);



// ------------------------ Compose it all together //
const App = () => h('section.life-tracker', [
	h('h1', ['Life Tracker']),
	h('div.flex-row', [
		h(LinkedSimpleEvent),
		h(LinkedAdminTools),
	]),
]);

render(h(Provider, { store }, [
	h(App),
]), document.body);
