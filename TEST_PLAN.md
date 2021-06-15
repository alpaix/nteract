When releasing the nteract desktop app, run through the following test plan to ensure that everything is A-OK before releasing.

Before starting the test plan, build the distributed nteract assets using the command below. This command will generate a set of binaries that will be stored in the `applications/desktop/dist` directory.

```
$ yarn dist:all
```

> ℹ Note:
> 
> It's not possible to build the Mac version of nteract from a Windows, so using `yarn dist:all` won't work. To test only on Windows, run `yarn dist` instead.

> ℹ Note:
> 
> If you run into a JavaScript heap out of memory error, you might need to temporarily increase the heap size by within the NODE_OPTIONS variable. For example, on Windows this can be achieved by running `set NODE_OPTIONS=--max_old_space_size=8172` in Command Prompt before running the yarn command.

If possible, run through this test plan on the different supported operating systems: Windows, macOS, and Linux.

## Scenario 1: Opening and editing an existing notebook

1. Open an existing notebook using the File > Open window.
2. Run the first cell in the notebook.
3. Ensure that the kernel launches and the cell executes.
4. Modify the notebook by adding a new cell and running it.
5. Save the notebook.
6. Close the notebook and open it again. Confirm that your changes have been saved.

## Scenario 2: Modifying the notebook UI

1. Toggle the output and input visibility of a notebook and verify that it works.
2. Toggle whether or not an output is expanded and verify that it works.
    - Here's an example of a cell to use to try this: `print('a\n'*1000)`
3. Toggle the theme of the notebook and verify that it is changed.
4. Toggle the Editor Type between CodeMirror and Monaco and verify that it changes.
5. Close the nteract desktop app.
6. Open the nteract desktop app and confirm that saved configurations are reloaded.

## Scenario 3: Testing notebook features
1. Open a notebook with ipywidgets (such as [this one](https://github.com/jupyter-widgets/ipywidgets/blob/master/docs/source/examples/Widget%20List.ipynb)) and confirm that they work.
    - Note: Requires the [ipywidgets](https://ipywidgets.readthedocs.io/en/latest/user_install.html) package.
2. Open a notebook with a data explorer visualization and confirm that it works.
    - You can use an example notebook (File -> Open Example Notebook -> python -> "Try the Data Explorer") or one of your own.
    - Note: Requires the `pandas` and `vdom` packages
3. Open a notebook with a GeoJSON map and confirm that it works.
    - You can use an example notebook (File -> Open Example Notebook -> python -> "Explore Your World with GeoJSON", or "Go from Pandas to GeoJSON") or one of your own.
