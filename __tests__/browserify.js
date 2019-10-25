const browserify = require("browserify");
const path = require("path");
const vm = require("vm");

describe("browserify", function() {
  it("@swc/register may be used without breaking browserify", function(done) {
    const bundler = browserify(
      path.join(__dirname, "fixtures/browserify/register.js")
    );

    bundler.bundle(function(err, bundle) {
      if (err) return done(err);
      expect(bundle.length).toBeTruthy();

      // ensure that the code runs without throwing an exception
      vm.runInNewContext("var global = this;\n" + bundle, {});
      done();
    });
  });
});
