export const messages: Record<string, string> = {
  // Navigation
  'nav.file': 'File',
  'nav.open': 'Open',
  'nav.fileInfo': 'File Info',
  'nav.inspection': 'Inspection',
  'nav.defects': 'Defects',
  'nav.classes': 'Classes',
  'nav.wafer': 'Wafer',
  'nav.waferMap': 'Wafer Map',
  'nav.analysis': 'Analysis',
  'nav.pareto': 'Pareto',
  'nav.spatial': 'Spatial',
  'nav.yield': 'Yield',
  'nav.settings': 'Settings',
  'nav.correlation': 'Correlation',
  'nav.trend': 'Trend',
  'nav.cluster': 'Cluster',
  'nav.scratch': 'Scratch',
  'nav.spc': 'SPC',
  'nav.classifier': 'Classifier',
  'nav.collapse': 'Collapse',
  'nav.expand': 'Expand',

  // Common
  'common.open': 'Open',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.noData': 'No data loaded',
  'common.noFileLoaded': 'No file loaded',
  'common.tryAgain': 'Try again',
  'common.home': 'Home',
  'common.openFileHint': 'Open a KLARF file to get started',
  'common.defects': 'Defects',
  'common.or': 'or',
  'common.selected': 'Selected',
  'common.clearSelection': 'Clear selection',

  // File Manager
  'file.openInspection': 'Open Inspection',
  'file.dropOrBrowse': 'Drop a file here or browse to open',
  'file.browseFiles': 'Browse Files',
  'file.supported': 'Supported formats: KLARF',
  'file.parseError': 'Failed to parse file',
  'file.tryAnother': 'Try another file',
  'file.readingFile': 'Reading file...',
  'file.parsing': 'Parsing...',
  'file.generateTestData': 'Generate Test Data',

  // File Info
  'fileInfo.title': 'File Information',
  'fileInfo.source': 'Source',
  'fileInfo.identification': 'Identification',
  'fileInfo.waferGeometry': 'Wafer Geometry',
  'fileInfo.equipment': 'Equipment',
  'fileInfo.statistics': 'Statistics',
  'fileInfo.parseWarnings': 'Parse Warnings',
  'fileInfo.fileName': 'File Name',
  'fileInfo.format': 'Format',
  'fileInfo.fileSize': 'File Size',
  'fileInfo.parsedAt': 'Parsed At',
  'fileInfo.lotId': 'Lot ID',
  'fileInfo.waferId': 'Wafer ID',
  'fileInfo.deviceId': 'Device ID',
  'fileInfo.slot': 'Slot',
  'fileInfo.stepId': 'Step ID',
  'fileInfo.waferDiameter': 'Wafer Diameter',
  'fileInfo.diePitch': 'Die Pitch',
  'fileInfo.dieOrigin': 'Die Origin',
  'fileInfo.center': 'Center',
  'fileInfo.orientationMark': 'Orientation Mark',
  'fileInfo.vendor': 'Vendor',
  'fileInfo.model': 'Model',
  'fileInfo.equipmentId': 'Equipment ID',
  'fileInfo.setupRecipe': 'Setup / Recipe',
  'fileInfo.totalDefects': 'Total Defects',
  'fileInfo.defectClasses': 'Defect Classes',
  'fileInfo.diesInMap': 'Dies in Map',
  'fileInfo.testPlanDies': 'Test Plan Dies',
  'fileInfo.defectColumns': 'Defect Columns',

  // Defect Table
  'defects.title': 'Defects',
  'defects.defectTable': 'Defect Table',

  // Classes
  'classes.title': 'Defect Classes',
  'classes.classLookup': 'Class Lookup',
  'classes.classNumber': 'Class Number',
  'classes.className': 'Class Name',
  'classes.classCode': 'Class Code',
  'classes.defectCount': 'Defect Count',
  'classes.noClasses': 'No classes defined',

  // Wafer Map
  'waferMap.zoomIn': 'Zoom In',
  'waferMap.zoomOut': 'Zoom Out',
  'waferMap.fitToWindow': 'Fit to Window',
  'waferMap.rotate': 'Rotate',
  'waferMap.legend': 'Legend',
  'waferMap.pass': 'Pass',
  'waferMap.fail': 'Fail',
  'waferMap.untested': 'Untested',
  'waferMap.defect': 'Defect',
  'waferMap.selectHint': 'Click a die to select it',

  // Analysis - Pareto
  'pareto.title': 'Pareto Analysis',
  'pareto.defectCount': 'Defect Count',
  'pareto.cumulative': 'Cumulative %',

  // Analysis - Spatial
  'spatial.title': 'Spatial Analysis',
  'spatial.downsampled': 'Downsampled for performance',

  // Analysis - Yield
  'yield.title': 'Yield Analysis',
  'yield.totalDefects': 'Total Defects',
  'yield.defectDensity': 'Defect Density',
  'yield.dieYield': 'Die Yield',
  'yield.classCount': 'Class Count',
  'yield.sizeDistribution': 'Size Distribution',
  'yield.defectsPerDie': 'Defects per Die',

  // Analysis - Correlation
  'correlation.title': 'Correlation Analysis',
  'correlation.xAxis': 'X Axis',
  'correlation.yAxis': 'Y Axis',
  'correlation.regressionLine': 'Regression Line',
  'correlation.pearsonR': 'Pearson R',

  // Analysis - Trend
  'trend.title': 'Trend Analysis',
  'trend.metric': 'Metric',
  'trend.defectCount': 'Defect Count',
  'trend.defectDensity': 'Defect Density',
  'trend.dieYield': 'Die Yield',

  // Analysis - Cluster
  'cluster.title': 'Cluster Analysis',
  'cluster.epsilon': 'Epsilon',
  'cluster.minPoints': 'Min Points',
  'cluster.clusters': 'Clusters',
  'cluster.noise': 'Noise',

  // Analysis - Scratch
  'scratch.title': 'Scratch Detection',
  'scratch.threshold': 'Threshold',
  'scratch.minInliers': 'Min Inliers',
  'scratch.detected': 'Scratches Detected',

  // Analysis - SPC
  'spc.title': 'SPC Chart',
  'spc.metric': 'Metric',
  'spc.mean': 'Mean',
  'spc.sigma': 'Sigma',
  'spc.ooc': 'Out of Control',

  // Analysis - Classifier
  'classifier.title': 'Defect Classifier',
  'classifier.suggestedClass': 'Suggested Class',
  'classifier.confidence': 'Confidence',
  'classifier.rule': 'Rule',

  // Filters
  'filters.title': 'Filters',
  'filters.defectClass': 'Defect Class',
  'filters.search': 'Search',
  'filters.searchPlaceholder': 'Search defects...',
  'filters.clearAll': 'Clear All',
  'filters.sliders': 'Range Sliders',

  // Export
  'export.title': 'Export',
  'export.csv': 'Export CSV',
  'export.png': 'Export PNG',
  'export.pdf': 'Export PDF',

  // Settings
  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.language': 'Language',
  'settings.about': 'About',
  'settings.system': 'System',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.highContrast': 'High Contrast',
  'settings.cleanroom': 'Cleanroom',
  'settings.aboutDescription': 'Lancelot is a KLARF wafer inspection data viewer and analysis tool.',

  // Generator
  'generator.title': 'KLARF Generator',
  'generator.description': 'Generate synthetic KLARF test data for development and testing.',
  'generator.defectCount': 'Defect Count',
  'generator.distribution': 'Distribution',
  'generator.waferDiameter': 'Wafer Diameter',
  'generator.generate': 'Generate',
  'generator.generating': 'Generating...',
  'generator.cancel': 'Cancel',
  'generator.random': 'Random',
  'generator.edgeHeavy': 'Edge Heavy',
  'generator.clustered': 'Clustered',
  'generator.mixed': 'Mixed',

  // Status Bar
  'statusBar.noFileLoaded': 'No file loaded',
  'statusBar.filters': 'Filters',
};
