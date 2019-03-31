import fp from 'lodash/fp';
import { render, Component, linkEvent, createRef } from 'inferno';
import { h } from 'inferno-hyperscript';
import { Provider, connect } from 'inferno-redux';
import { createStore, applyMiddleware } from 'redux';
import cuid from 'cuid';

import './index.css';

// -------------- State ---------------- //
const createAction = (type, payload) => ({ type, payload });
const defaultState = {
	events: [],
};
const RECORD_EVENT = 'LifeTracker:RECORD_EVENT';
const recordEvent = name => createAction(RECORD_EVENT, { name, at: Date.now() });
const reducer = (state = defaultState, action) => {
	switch (action.type) {
		case RECORD_EVENT:
			return {
				...state,
				events: state.events.concat(action.payload),
			};
		default:
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
	() => next => action => {
		shouldSave = true;
		return next(action);
	})
);
setInterval(() => {
	if (shouldSave) {
		window.localStorage.setItem(PERSIST_KEY, JSON.stringify(store.getState()));
		console.info('Saved state.');
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
} = {}) => h('.form-field', [
	label ? h('label', { for: 'add-field-name' }, 'New Field Name') : undefined,
	h('input', { id, type: 'text', ...inputArgs }),
]);


// @todo: if I wanna add a chart this is the pattern to get the div
class DivAccess extends Component {
	constructor(props) {
		super(props);
		this.divRef = createRef();
	}

	componentDidMount() {
		console.log(this.divRef);
	}

	render(props) {
		return h('div', { ...props, ref: this.divRef });
	}
}


// --------------------- Simple Event -- phase 1 --------------- //
class SimpleEvent extends Component {
	constructor(props){
		super(props);
		this.state = {};
	}

	canSubmitEvent({ event } = {}) {
		return !!event;
	}

	render({ addEvent } = {}) {
		const {
			event = '',
		} = this.state;

		return h('section.simple-event', [
			h('h3', 'Record Event'),
			h('.flex-row', [
				TextInput({
					label: 'event',
					value: event,
					onInput: linkEvent(this, updatePath(['event'])),
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
	() => ({}),
	(dispatch) => ({
		addEvent: (evt) => dispatch(recordEvent(evt)),
	}),
)(SimpleEvent);





// --------------------- ADMIN TOOLS --------------- //
const AdminTools = ({
	eventsBarData,
	eventsByHour,
}) => h('section.admin-tools', [
	h('h3', ['Admin Tools']),
	h('section.data-sets', [
		h('h4', 'Events'),
		h('ul', [
			...eventsBarData.map(pt => h('li', [
				`${pt.label}: ${pt.count}`
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
		])
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
)(AdminTools);






// ------------------------ Compose it all together //
const App = () => h('section.life-tracker', [
	h('h1', ['Life Tracker']),
	h('.flex-row', [
		h(LinkedSimpleEvent),
		h(LinkedAdminTools),
	]),
]);

render(h(Provider, { store }, [
	h(App),
]), document.body);

setInterval(() => {
	store.dispatch(recordEvent(fp.sample([
		'Brushed Teeth',
		'10 second plank',
		'stretch',
	])));
}, 150);