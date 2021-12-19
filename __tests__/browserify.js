const browserify = require("browserify");
const path = require("path");
const vm = require("vm");

describe("browserify", function() {
  it("@swc/register may be used without breaking browserify", () => {
    const bundler = browserify(
      path.join(__dirname, "fixtures/browserify/register.js")
    );

    return new Promise((resolve, reject) => {
      bundler.bundle(function (err, bundle) {
        if (err) return reject(err);
        expect(bundle.length).toBeTruthy();

        // ensure that the code runs without throwing an exception
        vm.runInNewContext("var global = this;\n" + bundle, {});
        resolve();
      });
    });
  });
});
