SuperSQLStore.ObservableRow = Classify.newClass({
    constructor: function(config) {
        var self = this;

        config = config || {};
        var row = config.row;
        self._originalData = row;
        self._columns = {};

        // Loop through the properties on the row to make observable versions of each column.
        jQuery.each(_.keys(row), function(index, propertyName) {
            var value = row[propertyName];

            // Filter out non-primative properties, as well as properties that start with an underscore
            if ((!_.isArray(value) && (_.keys(value)).length === 0) && (!propertyName.toString().match(/^_/))) {
                //TODO: Eventually, handle the loading of urn link values.
                if ( (value === null) || !value.toString().match(/^urn:/)) {
                    self[propertyName] = ko.observable(value);
                    self._columns[propertyName] = true;
                }
            }
        });
    },
    methods: {
        getColumn: function(key) {
            if ( (key in this._columns) && (ko.isObservable(this[key])) ) {
                return this[key]();
            }
            else {
                return undefined;
            }
        },
        setColumn: function(key, newVal) {
            if ( (key in this._columns) && (ko.isObservable(this[key])) ) {
                var oldVal = this[key]();
                this[key](newVal);
                return oldVal;
            }
            else {
                return undefined;
            }
        },
        hasBeenModified: function() {
            //TODO: consider using objects and flags to make this more efficient.
            var self = this;
            var hasBeenModified = false;
            jQuery.each(this._columns, function(key) {
                if (self._originalData[key] !== self.getColumn(key)) {
                    hasBeenModified = true;
                }
            });
            return hasBeenModified;
        },
        columnHasBeenModified: function(column) {
            if (self._originalData[column] !== self.getColumn(column)) {
                return true;
            }
            else {
                return false;
            }
        }
    },
    computeds: {
        getRawRowData: function() {
            var self = this;
            var rowData = _.clone(this._originalData);

            jQuery.each(this._columns, function(key) {
                rowData[key] = self.getColumn(key);
            });

            return rowData;
        }
    }
});


SuperSQLStore.ObservableTable = Classify.newClass({
    constructor: function(config) {
        config = config || {};

        var rowConstructor = SuperSQLStore.ObservableRow;
        if ('rowConstructor' in config) {
            rowConstructor = config.rowConstructor;
        }

        var rows = [];
        if (!_.isArray(config.rows)) {
            rows = _.map(config.rows, function(row) {
                return new rowConstructor({
                    row: value
                })
            });
        }
        this.rows = ko.observableArray(rows);
    },
    methods: {
        each: function(callback) {
            ko.utils.arrayForEach(this.rows(), function(row) {
                callback.call(row,row);
            });
        }
    },
    computeds: {
        getRawRows: function() {
            var rows = [];

            ko.utils.arrayForEach(this.rows(), function(row) {
                rows.push(row.getRawRowData());
            });

            return rows;
        },
        // Give us a computed that tracks modifications.
        changedRowsRaw: function() {

            var changedRows = _.filter(this.rows(), function(row) {
                if ( row.hasBeenModified() ) {
                    return true;
                }
                else {
                    return false;
                }
            });

            changedRows = _.map(changedRows, function(row) {
                return row.getRawRowData();
            });

            return changedRows;
        }
    }
});

SuperSQLStore.IndexedObservableTable = Classify.newClass({
    parent: SuperSQLStore.ObservableTable,
    constructor: function(config) {
        var self = this;
        if (!('key' in config)) {
            throw "You need to supply a key to index on in an IndexedObservableTable";
        }
        this.keyForIndex = config.key;

        // Build the index
        this.keyIndex = {};
        _.each(this.rows(), function(row, index) {
            self.keyIndex[ko.unwrap(row[self.keyForIndex])] = index;
        });

        // Ensure that the index is up to date.
        this.rows.subscribe(function(changes) {
            _.each(changes, function(change) {
                //  Note: change is of the following form:
                //     change = {
                //         index:  3,        // index of the change.
                //         status: 'added',  // 'added', 'deleted'
                //         moved:  1,        // optional: the index to which this element has moved
                //         value:  {}        // Value of the array element
                var keyValue = ko.unwrap(change.value[self.keyForIndex]);
                var index    = self.keyIndex;

                if ( 'moved' in change ) {
                    index[keyValue] = change.moved;
                }
                else if ( change.status === 'added' ) {
                    index[keyValue] = change.index;
                }
                else if ( change.status === 'deleted' ) {
                    delete index[keyValue];
                }
            });
        }, null, "arrayChange");
    },
    methods: {
        getRowByKey: function(key) {
            return this.rows()[this.keyIndex[key]];
        }
    }
});

SuperSQLStore.Version = '{{VERSION}}';
