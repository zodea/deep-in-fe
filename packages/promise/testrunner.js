var adapter = require('./Promis')
var promisesAplusTests = require('promises-aplus-tests')

promisesAplusTests(adapter, { reporter: 'dot' }, function (err) {
  // As before.
  console.log(err)
})
