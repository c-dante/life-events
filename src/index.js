import fp from 'lodash/fp';
import { render, Component, linkEvent } from 'inferno';
import { h } from 'inferno-hyperscript';
import cuid from 'cuid';

import './index.css';

// Name -> Dataset
const dataSets = [];
const dataSetRegistry = {};

// Name -> Field
const fields = [];
const fieldRegistry = {};

// Id -> Dataset
const dataSetToRecords = {};

// Helper to set a path
const updatePath = (path) => (ctrl, evt) => ctrl.setState(fp.set(path, evt.target.value, {}));

class Field extends Component {
	render() {
		return h('.field', `Hi I'm a field`);
	}
};

const canAddField = (field) => field.name && field.type && !fieldRegistry[field.name];

const addField = (ctrl, evt) => {
	const field = fp.pick(['name', 'value', 'type'], ctrl.state);
	field.id = cuid();
	fields.push(field);
	fieldRegistry[field.name] = field;
};

// -------------------- General Cimponent ----------------- //
const TextInput = ({
	id = `anon-text-${cuid()}`,
	label,
	...inputArgs,
} = {}) => h('.form-field', [
	label ? h('label', { for: 'add-field-name' }, 'New Field Name') : undefined,
	h('input', { id, type: 'text', ...inputArgs }),
]);

class AddField extends Component {
	constructor(props) {
		super(props);

		this.state = { ...props };
	}

	render({
		dataSetName,
	}, {
		name, value, type // from state
	} = {}) {
		const field = { name, value, type };
		console.debug('addfield', { name, value, type });
		return h('.add-field.flex-row.flex-end', [
			// Name -- Whatever you want
			h('.form-field', [
				h('label', { for: 'add-field-name' }, 'New Field Name'),
				h('input#add-field-name', {
					value: name,
					onInput: linkEvent(this, updatePath(['name'])),
				}),
			]),

			// Type -- Search for existing types to extend
			h('.form-field', [
				h('label', { for: 'add-field-value' }, 'Value'),
				h('input#add-field-value', {
					value,
					onInput: linkEvent(this, updatePath(['value'])),
				}),
			]),

			// Type -- Optional, override but derived from input
			// @todo: write derive fn based on value + pristine
			h('.form-field', [
				h('label', { for: 'add-field-type' }, 'Type'),
				h('input#add-field-type', {
					value: type,
					onInput: linkEvent(this, updatePath(['type'])),
				}),
			]),

			h('.form-field', [
				h('button', {
					disabled: !canAddField(field),
					onClick: linkEvent(this, addField),
				}, 'Add Field'),
			]),
		]);
	}
};


// --------------- Data Entry -------------------- //
const changeDataSet = (ctrl, event) => {
	ctrl.setState({
		dataSetName: event.target.value,
	});
};

const canSubmitRecord = (state) => {
	return !!state.dataSetName; // Try.failure('Requires data set name.');
};

class DataEntry extends Component {
	constructor(props){
		super(props);
		this.state = {};
	}

	render() {
		const {
			dataSetName,
			fields = [],
		} = this.state;

		console.log('data entry', this.state);

		return h('section.data-entry', [
			h('.data-set', [
				h('h3', 'New Record'),
				h('.flex-column', [
					// @todo: autocomplete from dataSetRegistry
					h('.form-field', [
						h('label', { for: 'data-set-name' }, 'Dataset Name'),
						h('input#data-set-name', {
							value: dataSetName,
							onInput: linkEvent(this, changeDataSet),
						}),
					]),

					h('section.fields', [
						...fields.map(field => h(Field, field)),
					]),

					// Add field
					h(AddField, { dataSetName }),

					h('button', {
						disabled: !canSubmitRecord(this.state),
					}, 'Add Record'),
				]),
			]),
		]);
	}
};


// --------------------- Simple Event -- phase 1 --------------- //
const SimpleEvent = ({}, state) => h('section.simple-event', [
	h('h3', 'Record Event'),
	h('.flex-row', [
		TextInput({
			label: 'event',
		}),
		h('button', {
		}, 'Add Record'),
	])
]);


// --------------------- ADMIN TOOLS --------------- //
const AdminTools = () => h('section.admin-tools', [
	h('h3', ['Admin Tools']),
	h('section.data-sets', [
		h('h4', 'Data Sets'),
		...dataSets.map(x => x.name),
		!dataSets.length ? 'No data sets' : undefined,
	]),
	h('section.fields-sets', [
		h('h4', 'Fields'),
		...fields.map(x => x.name),
		!fields.length ? 'No fields' : undefined,
	]),
]);






// ------------------------ Compose it all together //
const App = () => h('section.life-tracker', [
	h('h1', ['Life Tracker']),
	h('.flex-row', [
		// h(DataEntry),
		h(SimpleEvent),
		h(AdminTools),
	]),
]);

render(h(App), document.body);
