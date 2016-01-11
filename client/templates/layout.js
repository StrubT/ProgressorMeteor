Template.layout.helpers(
	{
		language: function () {

			return i18n.languages[ i18n.getLanguage() ];
		},
		languages: function () {

			return _.map(i18n.languages, function (name, id) {
				return {
					id: id,
					name: name
				};
			});
		},
		isActive: function () {

			return this.id === i18n.getLanguage();
		},
		i18nProgrammingLanguages: function () {

			return _.map(programmingLanguages, function (id) {
				return {
					_id: id,
					name: id //i18n('programmingLanguage.' + id)
				};
			});
		}
	});

Template.layout.events(
	{
		'click .i18n.lang': function (ev) {
			ev.preventDefault();

			i18n.setLanguage($(ev.currentTarget).data('lang'));
		}
	});
