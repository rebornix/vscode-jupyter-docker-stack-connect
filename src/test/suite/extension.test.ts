import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { SciPyContainerServerProvider } from '../../providers/scipyImageProvider';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('SciPyContainerServerProvider uses default container image', () => {
		const logger = vscode.window.createOutputChannel('Test');
		const provider = new SciPyContainerServerProvider(logger);
		const quickPickItems = provider.getQuickPickEntryItems();
		
		assert.strictEqual(quickPickItems.length, 1);
		assert.strictEqual(quickPickItems[0].detail, 'jupyter/scipy-notebook:85f615d5cafa');
		
		logger.dispose();
	});

	test('SciPyContainerServerProvider uses custom container image from configuration', async () => {
		const customImage = 'quay.io/jupyter/scipy-server:latest';
		const config = vscode.workspace.getConfiguration('jupyter-docker-stack-connect');
		
		// Update the configuration
		await config.update('containerImage', customImage, vscode.ConfigurationTarget.Global);
		
		const logger = vscode.window.createOutputChannel('Test');
		const provider = new SciPyContainerServerProvider(logger);
		const quickPickItems = provider.getQuickPickEntryItems();
		
		assert.strictEqual(quickPickItems.length, 1);
		assert.strictEqual(quickPickItems[0].detail, customImage);
		
		// Clean up
		await config.update('containerImage', undefined, vscode.ConfigurationTarget.Global);
		logger.dispose();
	});
});
