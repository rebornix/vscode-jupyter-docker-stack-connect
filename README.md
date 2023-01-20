# Jupyter Docker Stack Connect

This extension allows you to launch Jupyter servers from Docker containers (powered by [Jupyter Docker Stack](https://jupyter-docker-stacks.readthedocs.io/en/latest/)) and connect directly from the Notebook Editor in Visual Studio Code.

## Features

* Launch Jupyter servers from Docker containers, no need to worry about affecting your local Python setup
* Access launched Jupyter servers from notebook editor in VS Code

## How to use

1. Open a notebook and click on the kernel selector (or open the Command Palette (`Cmd+Shift+P`) then select **Notebook: Select Notebook Kernel**)
2. Select **Select Another Kernel**
3. Select **Jupyter Server from Docker Containers**
4. Select a container image for your project (currently, the [Scientific Python](https://hub.docker.com/r/jupyter/scipy-notebook) Stack is supported)
5. Select the kernel from the container image (e.g., Python 3)
6. Happy coding!

## Requirements

* Visual Studio Code Insiders
* Docker

## Usage

* Install the extension from the Visual Studio Code marketplace

If you have any issues or feature requests, please open an issue on the GitHub repository.

## Contributing

If you would like to contribute to the development of this extension, please fork the repository and submit a pull request.
