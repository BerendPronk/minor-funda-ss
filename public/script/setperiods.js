// Sets periods for a correct thousands-notation

module.exports = function(input, value) {
	var numbers = value.split("").reverse();
	var periods = [];

	for (var index = 1; index <= numbers.length; index++) {
		periods.push(numbers[index - 1]);
		if (index % 3 === 0 && index != numbers.length) {
			periods.push('.');
		}
	}

	var val = periods.reverse().join("");
	input.parentNode.setAttribute('period-value', val);
};
