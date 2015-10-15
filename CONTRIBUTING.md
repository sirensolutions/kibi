If you have a bugfix or new feature that you would like to contribute to Kibi, please **find or open an issue about it before you start working on it.** Talk about what you would like to do. It may be that somebody is already working on it, or that there are particular issues that you should know about before implementing the change.

We enjoy working with contributors to get their code accepted. There are many approaches to fixing a problem and it is important to find the best approach before writing too much code.

### Sign the contributor license agreement

Please make sure you have signed the [Contributor License Agreement](http://siren.solutions/kibi/contributors/). We are not asking you to assign copyright to us, but to give us the right to distribute your code without restriction. We ask this of all contributors in order to assure our users of the origin and continuing existence of the code. You only need to sign the CLA once.

### Development Environment Setup

- Install node.js (we recommend using [nvm](https://github.com/creationix/nvm))

  ```sh
  ## follow directions at https://github.com/creationix/nvm, then
  nvm install 0.10
  ```

- Install grunt and bower globally (as root if not using nvm)

  ```sh
  npm install -g grunt-cli bower
  ```

- Clone the kibi repo and move into it

  ```sh
  git clone https://github.com/sirensolutions/kibi.git kibi
  cd kibi
  ```

- Install node and bower dependencies

  ```sh
  npm install && bower install
  ```

- Setup datasources

  Setup one or more datasources in **kibi.yml**; the file contains several
  commented examples.

  ```
  datasources:
    crunchbase-sqlite:
      type: sqlite
      dbfile: crunchbase.db
  ```

- Start the development server.

  ```sh
  grunt dev # use the "--with-es" flag to install & start elasticsearch too
  ```

#### Debug backend queries

Kibi has custom queries that are formatted for execution on the Elasticsearch index. In order to view the result of this processing, you need to set the logging level to `DEBUG` in **kibi.yml**:

```yml
log_level: DEBUG
```

The logs are JSON-formatted, and the queries sent to Elasticsearch -- after custom processing -- are available in the `queries` attribute. You can grab for those queries, by using the [jq](https://stedolan.github.io/jq/) tool for example, as follows:

```sh
tail -f kibi.log | jq 'select(has("queries"))'
```

#### Backup and restore of the .kibi index

To make a backup of the .kibi index run:

```
./resources/saveAll.sh ./kibi/data/FOLDER_NAME
```

The objects in the index will be saved into subfolders of `.kibi/data` called:

  - `visualization`
  - `search`
  - `dashboard`
  - `snippet`
  - `template`

To restore these objects run:

```
./resources/loadAll.sh ./kibi/data/FOLDER_NAME
```

#### JDBC datasources

If you need to work on or test JDBC datasources, create a symbolic link
to `$JAVA_HOME/lib/server` at the root of the repository.

OS X example:

```
# Find JAVA_HOME
/usr/libexec/java_home -v 1.7

# Create symbolic link
ln -s /Library/Java/JavaVirtualMachines/jdk1.7.0_60.jdk/Contents/Home/jre/lib/server java_home_lib_server
```

Linux example:

```
ln -s /usr/lib/jvm/default-runtime/lib/amd64/server java_home_lib_server
```


#### Linting

A note about linting: We use both [jshint](http://jshint.com/) and [jscs](http://jscs.info/) to check that the [styleguide](STYLEGUIDE.md) is being followed. They run in a pre-commit hook and as a part of the tests, but most contributors integrate these linters with their code editors for real-time feedback.

Here are some hints for setting up the linters in your favorite editor:

| Editor | JSHint | JSCS |
| --- | --- | --- |
| Sublime | [SublimeLinter-jshint](https://github.com/SublimeLinter/SublimeLinter-jshint#installation) | [SublimeLinter-jscs](https://github.com/SublimeLinter/SublimeLinter-jscs#installation) |
| Atom | [linter-jshint](https://github.com/AtomLinter/linter-jshint#installation) | [linter-jscs](https://github.com/AtomLinter/linter-jscs#installation) |
| IntelliJ | Settings » Languages & Frameworks » JavaScript » Code Quality Tools » JSHint (be sure to check "Use config files") | « |
| vi | ask @simianhacker | « |


### Testing and building

To ensure that your changes will not break other functionality, please run the test suite and build process before submitting your pull request.

Before running the tests you will need to install the projects dependencies as described below.

Once that is complete just run:

```sh
grunt test build
```

Distributable, built packages can be found in `target/` after the build completes.

### Submit a pull request

Push your local changes to your forked copy of the repository and submit a pull request. In the pull request, describe what your changes do and mention the number of the issue where discussion has taken place, eg “Closes #123″.

Always submit your pull against `master` unless the bug is only present in an older version. If the bug effects both `master` and another branch say so in your pull.

Then sit back and wait. There will probably be discussion about the pull request and, if any changes are needed, we'll work with you to get your pull request merged into Kibi.

### The road to review

After a pull is submitted, it needs to get to review. If you have commit permission on the Kibi repo you will probably perform these steps while submitting your pull request. If not, a member of the sirensolutions organization will do them for you, though you can help by suggesting a reviewer for your changes if you've interacted with someone while working on the issue.

1. Assign the `review` tag. This signals to the team that someone needs to give this attention.
1. Assign version tags. If the pull is related to an existing issue (and it should be!), that issue probably has a version tag (eg `4.0.1`) on it. Assign the same version tag to your pull. You may end up with 2 or more version tags if the changes requires backporting
1. Find someone to review your pull. Don't just pick any yahoo, pick the right person. The right person might be the original reporter of the issue, but it might also be the person most familiar with the code you've changed. If neither of those things apply, or your change is small in scope, try to find someone on the Kibi team without a ton of existing reviews on their plate. As a rule, most pulls will require 2 reviewers, but the first reviewer will pick the 2nd.

### Review engaged

So, you've been assigned a pull to review. What's that look like?

Remember, someone is blocked by a pull awaiting review, make it count. Be thorough, the more action items you catch in the first review, the less back and forth will be required, and the better chance the pull has of being successful. Don't you like success?

1. **Understand the issue** that is being fixed, or the feature being added. Check the description on the pull, and check out the related issue. If you don't understand something, ask the person the submitter for clarification.
1. **Reproduce the bug** (or the lack of feature I guess?) in the destination branch, usually `master`. The referenced issue will help you here. If you're unable to reproduce the issue, contact the issue submitter for clarification
1. **Check out the pull** and test it. Is the issue fixed? Does it have nasty side effects? Try to create suspect inputs. If it operates on the value of a field try things like: strings (including an empty string), null, numbers, dates. Try to think of edge cases that might break the code.
1. **Read the code**. Understanding the changes will help you find additional things to test. Contact the submitter if you don't understand something.
1. **Go line-by-line**. Are there [style guide](https://github.com/sirensolutions/kibi/blob/master/STYLEGUIDE.md) violations? Strangely named variables? Magic numbers? Do the abstractions make sense to you? Are things arranged in a testable way?
1. **Speaking of tests** Are they there? If a new function was added does it have tests? Do the tests, well, TEST anything? Do they just run the function or do they properly check the output?
1. **Suggest improvements** If there are changes needed, be explicit, comment on the lines in the code that you'd like changed. You might consider suggesting fixes. If you can't identify the problem, animated screenshots can help the review understand what's going on.
1. **Hand it back** If you found issues, re-assign the submitter to the pull to address them. Repeat until mergable.
1. **Hand it off** If you're the first reviewer and everything looks good but the changes are more than a few lines, hand the pull to someone else to take a second look. Again, try to find the right person to assign it to.
1. **Merge the code** When everything looks good, merge into the target branch. Check the labels on the pull to see if backporting is required, and perform the backport if so.
