import './index.css';

import { render, Component, linkEvent } from 'inferno';
import { h } from 'inferno-hyperscript';

// Name -> Dataset
const dataSetRegistry = {};

// Name -> Field
const fieldRegistry = {};

class Field extends Component {
	render() {
		return h('.field', `Hi I'm a field`);
	}
};


const AddField  = ({
	dataSetName,
	newFieldName, newFieldValue, newFieldType,
	// dataSetRegistry // @todo: don't close over
} = {}) => h('.add-field.flex-row', [
	// Name -- Whatever you want
	h('.form-field', [
		h('label', { for: 'add-field-name' }, 'New Field Name'),
		h('input#add-field-name', {
			value: newFieldName,
		}),
	]),

	// Type -- Search for existing types to extend
	h('.form-field', [
		h('label', { for: 'add-field-value' }, 'Value'),
		h('input#add-field-type', {
			value: newFieldValue,
		}),
	]),

	// Type -- Optional, override but derived from input
	// @todo: write derive fn based on value + pristine
	h('.form-field', [
		h('label', { for: 'add-field-type' }, 'Type'),
		h('input#add-field-type', {
			value: newFieldType,
		}),
	]),
	h('button', {}, 'Add Field'),
]);


// --------------- Data Entry -------------------- //
const changeDataSet = (ctrl, event) => {
	ctrl.setState({
		dataSetName: event.target.value,
	});
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

		console.log(this.state);

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

					h('button', {}, 'Add Record'),

					// Add field
					h(AddField, { dataSetName }),
				]),
			]),
		]);
	}
};


// --------------------- ADMIN TOOLS --------------- //
const AdminTools = () => h('section.admin-tools', [
	h('h3', ['Admin Tools']),
]);


const App = () => h('section.life-tracker', [
	h('h1', ['Life Tracker']),
	h('.flex-row', [
		h(DataEntry),
		h(AdminTools),
	]),
]);

render(h(App), document.body);
