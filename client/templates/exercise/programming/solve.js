(function () {
	'use strict';

	let isResult, executionStatus, executionResults, blacklist, blacklistMatches, showSolution;

	function getExercise(forceRefresh = false) {
		return isResult.get() && !forceRefresh ? Progressor.results.findOne().exercise : Progressor.exercises.findOne();
	}

	function getResult() {
		if (isResult.get())
			return Progressor.results.findOne();
	}

	function getExecutionResults() {
		if (isResult.get() || (Progressor.results.find().count() && Progressor.exercises.findOne().lastEdited.getTime() === Progressor.results.findOne().exercise.lastEdited.getTime()))
			return Progressor.results.findOne().results;
		else
			return executionResults.get();
	}

	Template.programmingSolve.onCreated(function () {
		isResult = new ReactiveVar(false);
		executionStatus = new ReactiveVar(0x0);
		executionResults = new ReactiveVar([]);
		blacklist = new ReactiveVar(null);
		blacklistMatches = new ReactiveVar([]);
		showSolution = new ReactiveVar(false);
		Session.set('fragment', null);
		Session.set('solution', null);
	});

	Template.programmingSolve.onRendered(function () {
		this.autorun(function () {
			const result = Progressor.results.findOne(), exercise = Tracker.nonreactive(getExercise);
			if (result)
				Session.set('fragment', result.fragment);
			else if (exercise && exercise.fragment)
				Session.set('fragment', exercise.fragment);
			else
				Meteor.call('getFragment', getExercise().programmingLanguage, { _id: getExercise()._id }, Progressor.handleError((err, res) => Session.set('fragment', !err ? res : null)));
		});
	});

	Template.programmingSolve.helpers(
		{
			safeExercise(exerciseOrResult) {
				isResult.set(!!exerciseOrResult.exercise_id);
				return exerciseOrResult.exercise_id ? exerciseOrResult.exercise : exerciseOrResult;
			},
			isResult: () => isResult.get(),
			exerciseSearchData: () => ({ _id: getExercise().programmingLanguage }),
			exerciseSolveData: () => ({ _id: getResult() ? getResult().exercise_id : getExercise()._id }),
			changedAfterSolved: () => getExercise(true) && getResult() && getExercise(true).lastEdited > getResult().solved,
			resultSolved: () => getResult().solved,
			codeMirrorThemes() {
				const user = Meteor.user(), userTheme = user && user.profile && user.profile.codeMirrorTheme ? user.profile.codeMirrorTheme : Progressor.getCodeMirrorDefaultTheme();
				return _.map(Progressor.getCodeMirrorThemes(), theme => ({ _id: theme, isActive: theme === userTheme }));
			},
			codeMirrorOptions(isSolution = false) {
				const programmingLanguage = Progressor.getProgrammingLanguage(getExercise().programmingLanguage);
				return _.extend({}, Progressor.getCodeMirrorConfiguration(), { //https://codemirror.net/doc/manual.html
					autofocus: true,
					readOnly: isResult.get() || isSolution ? 'nocursor' : false,
					mode: programmingLanguage ? programmingLanguage.codeMirror : 'text/plain'
				});
			},
			executionDisabled: () => executionStatus.get() !== 0x0,
			blackListMessage: () => blacklistMatches.get().length ? i18n('exercise.blacklistMatchMessage', blacklistMatches.get().join(', ')) : null,
			testCaseSignature: c => Progressor.getTestCaseSignature(getExercise(), c),
			testCaseExpectedOutput: c => Progressor.getExpectedTestCaseOutput(getExercise(), c),
			testCasesEvaluated: () => Progressor.isExerciseEvaluated(getExercise(), getExecutionResults()),
			testCaseSuccess: c => Progressor.isTestCaseSuccess(getExercise(), c, getExecutionResults()),
			testCaseActualOutput: c => Progressor.getActualTestCaseOutput(getExercise(), c, getExecutionResults()),
			executionFatal: () => Progressor.isExerciseFatal(getExercise(), getExecutionResults()),
			showSolution: () => getExercise().solutionVisible && showSolution.get()
		});

	Template.programmingSolve.events(
		{
			'click #button-execute'() {
				Session.set('solution', null);
				showSolution.set(false);
				setTimeout(function () {
					const $result = $('#table-testcases').css('opacity', 1 / 3);
					executionStatus.set(executionStatus.get() | 0x1);
					Meteor.call('execute', getExercise().programmingLanguage, { _id: getExercise()._id }, Session.get('fragment'), Progressor.handleError(function (err, res) {
						executionResults.set(!err ? res : []);
						$result.css('opacity', 1);
						executionStatus.set(executionStatus.get() & ~0x1);
					}));
				}, 1);
			},
			'click #button-solution': () => {
				Session.set('solution', getExercise().solution);
				showSolution.set(true);
			},
			'click #button-close': () => {
				Session.set('solution', null);
				showSolution.set(false);
			},
			'keyup .CodeMirror': _.throttle(function () {
				if (!blacklist.get()) {
					blacklist.set([]);
					Meteor.call('getBlacklist', getExercise().programmingLanguage, Progressor.handleError((err, res) => blacklist.set(!err ? res : null)));
				} else {
					const fragment = Session.get('fragment');
					blacklistMatches.set(_.filter(blacklist.get(), blk => fragment.indexOf(blk) >= 0));
					executionStatus.set(blacklistMatches.get().length ? executionStatus.get() | 0x2 : executionStatus.get() & ~0x2);
				}
			}, 500),
			'change #select-codemirror-themes' (ev) {
				const theme = $(ev.currentTarget).val();
				$('.CodeMirror')[0].CodeMirror.setOption('theme', theme);
				Meteor.users.update(Meteor.userId(), { $set: { 'profile.codeMirrorTheme': theme } });
			}
		});

})();
