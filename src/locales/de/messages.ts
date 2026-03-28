export const messages: Record<string, string> = {
  // Navigation
  'nav.file': 'Datei',
  'nav.open': 'Öffnen',
  'nav.fileInfo': 'Dateiinfo',
  'nav.inspection': 'Inspektion',
  'nav.defects': 'Defekte',
  'nav.classes': 'Klassen',
  'nav.wafer': 'Wafer',
  'nav.waferMap': 'Wafer-Karte',
  'nav.analysis': 'Analyse',
  'nav.pareto': 'Pareto',
  'nav.spatial': 'Räumlich',
  'nav.yield': 'Ausbeute',
  'nav.settings': 'Einstellungen',
  'nav.correlation': 'Korrelation',
  'nav.trend': 'Trend',
  'nav.cluster': 'Cluster',
  'nav.scratch': 'Kratzer',
  'nav.spc': 'SPC',
  'nav.classifier': 'Klassifikator',
  'nav.collapse': 'Einklappen',
  'nav.expand': 'Ausklappen',

  // Common
  'common.open': 'Öffnen',
  'common.close': 'Schließen',
  'common.save': 'Speichern',
  'common.cancel': 'Abbrechen',
  'common.loading': 'Wird geladen...',
  'common.error': 'Fehler',
  'common.noData': 'Keine Daten geladen',
  'common.noFileLoaded': 'Keine Datei geladen',
  'common.openFileHint': 'Öffnen Sie eine KLARF-Datei, um zu beginnen',
  'common.defects': 'Defekte',
  'common.or': 'oder',
  'common.selected': 'Ausgewählt',
  'common.clearSelection': 'Auswahl aufheben',

  // File Manager
  'file.openInspection': 'Inspektion öffnen',
  'file.dropOrBrowse': 'Datei hier ablegen oder durchsuchen',
  'file.browseFiles': 'Dateien durchsuchen',
  'file.supported': 'Unterstützte Formate: KLARF',
  'file.parseError': 'Datei konnte nicht analysiert werden',
  'file.tryAnother': 'Andere Datei versuchen',
  'file.readingFile': 'Datei wird gelesen...',
  'file.parsing': 'Wird analysiert...',
  'file.generateTestData': 'Testdaten generieren',

  // File Info
  'fileInfo.title': 'Dateiinformationen',
  'fileInfo.source': 'Quelle',
  'fileInfo.identification': 'Identifikation',
  'fileInfo.waferGeometry': 'Wafer-Geometrie',
  'fileInfo.equipment': 'Ausrüstung',
  'fileInfo.statistics': 'Statistik',
  'fileInfo.parseWarnings': 'Analysewarnungen',
  'fileInfo.fileName': 'Dateiname',
  'fileInfo.format': 'Format',
  'fileInfo.fileSize': 'Dateigröße',
  'fileInfo.parsedAt': 'Analysiert am',
  'fileInfo.lotId': 'Los-ID',
  'fileInfo.waferId': 'Wafer-ID',
  'fileInfo.deviceId': 'Geräte-ID',
  'fileInfo.slot': 'Slot',
  'fileInfo.stepId': 'Schritt-ID',
  'fileInfo.waferDiameter': 'Wafer-Durchmesser',
  'fileInfo.diePitch': 'Die-Abstand',
  'fileInfo.dieOrigin': 'Die-Ursprung',
  'fileInfo.center': 'Mittelpunkt',
  'fileInfo.orientationMark': 'Orientierungsmarkierung',
  'fileInfo.vendor': 'Hersteller',
  'fileInfo.model': 'Modell',
  'fileInfo.equipmentId': 'Ausrüstungs-ID',
  'fileInfo.setupRecipe': 'Setup / Rezept',
  'fileInfo.totalDefects': 'Defekte gesamt',
  'fileInfo.defectClasses': 'Defektklassen',
  'fileInfo.diesInMap': 'Dies in der Karte',
  'fileInfo.testPlanDies': 'Testplan-Dies',
  'fileInfo.defectColumns': 'Defektspalten',

  // Defect Table
  'defects.title': 'Defekte',
  'defects.defectTable': 'Defekttabelle',

  // Classes
  'classes.title': 'Defektklassen',
  'classes.classLookup': 'Klassensuche',
  'classes.classNumber': 'Klassennummer',
  'classes.className': 'Klassenname',
  'classes.classCode': 'Klassencode',
  'classes.defectCount': 'Defektanzahl',
  'classes.noClasses': 'Keine Klassen definiert',

  // Wafer Map
  'waferMap.zoomIn': 'Vergrößern',
  'waferMap.zoomOut': 'Verkleinern',
  'waferMap.fitToWindow': 'An Fenster anpassen',
  'waferMap.rotate': 'Drehen',
  'waferMap.legend': 'Legende',
  'waferMap.pass': 'Bestanden',
  'waferMap.fail': 'Fehlgeschlagen',
  'waferMap.untested': 'Ungetestet',
  'waferMap.defect': 'Defekt',
  'waferMap.selectHint': 'Klicken Sie auf ein Die zur Auswahl',

  // Analysis - Pareto
  'pareto.title': 'Pareto-Analyse',
  'pareto.defectCount': 'Defektanzahl',
  'pareto.cumulative': 'Kumulativ %',

  // Analysis - Spatial
  'spatial.title': 'Räumliche Analyse',
  'spatial.downsampled': 'Für Leistung reduziert',

  // Analysis - Yield
  'yield.title': 'Ausbeute-Analyse',
  'yield.totalDefects': 'Defekte gesamt',
  'yield.defectDensity': 'Defektdichte',
  'yield.dieYield': 'Die-Ausbeute',
  'yield.classCount': 'Klassenanzahl',
  'yield.sizeDistribution': 'Größenverteilung',
  'yield.defectsPerDie': 'Defekte pro Die',

  // Analysis - Correlation
  'correlation.title': 'Korrelationsanalyse',
  'correlation.xAxis': 'X-Achse',
  'correlation.yAxis': 'Y-Achse',
  'correlation.regressionLine': 'Regressionslinie',
  'correlation.pearsonR': 'Pearson R',

  // Analysis - Trend
  'trend.title': 'Trendanalyse',
  'trend.metric': 'Kennzahl',
  'trend.defectCount': 'Defektanzahl',
  'trend.defectDensity': 'Defektdichte',
  'trend.dieYield': 'Die-Ausbeute',

  // Analysis - Cluster
  'cluster.title': 'Clusteranalyse',
  'cluster.epsilon': 'Epsilon',
  'cluster.minPoints': 'Mindestpunkte',
  'cluster.clusters': 'Cluster',
  'cluster.noise': 'Rauschen',

  // Analysis - Scratch
  'scratch.title': 'Kratzererkennung',
  'scratch.threshold': 'Schwellenwert',
  'scratch.minInliers': 'Min. Inlier',
  'scratch.detected': 'Kratzer erkannt',

  // Analysis - SPC
  'spc.title': 'SPC-Diagramm',
  'spc.metric': 'Kennzahl',
  'spc.mean': 'Mittelwert',
  'spc.sigma': 'Sigma',
  'spc.ooc': 'Außer Kontrolle',

  // Analysis - Classifier
  'classifier.title': 'Defektklassifikator',
  'classifier.suggestedClass': 'Vorgeschlagene Klasse',
  'classifier.confidence': 'Konfidenz',
  'classifier.rule': 'Regel',

  // Filters
  'filters.title': 'Filter',
  'filters.defectClass': 'Defektklasse',
  'filters.search': 'Suche',
  'filters.searchPlaceholder': 'Defekte suchen...',
  'filters.clearAll': 'Alle löschen',
  'filters.sliders': 'Bereichsregler',

  // Export
  'export.title': 'Exportieren',
  'export.csv': 'CSV exportieren',
  'export.png': 'PNG exportieren',
  'export.pdf': 'PDF exportieren',

  // Settings
  'settings.title': 'Einstellungen',
  'settings.theme': 'Farbschema',
  'settings.language': 'Sprache',
  'settings.about': 'Über',
  'settings.system': 'System',
  'settings.light': 'Hell',
  'settings.dark': 'Dunkel',
  'settings.highContrast': 'Hoher Kontrast',
  'settings.cleanroom': 'Reinraum',
  'settings.aboutDescription': 'Lancelot ist ein Viewer und Analysetool für KLARF-Wafer-Inspektionsdaten.',

  // Generator
  'generator.title': 'KLARF-Generator',
  'generator.description': 'Synthetische KLARF-Testdaten für Entwicklung und Tests generieren.',
  'generator.defectCount': 'Defektanzahl',
  'generator.distribution': 'Verteilung',
  'generator.waferDiameter': 'Wafer-Durchmesser',
  'generator.generate': 'Generieren',
  'generator.generating': 'Wird generiert...',
  'generator.cancel': 'Abbrechen',
  'generator.random': 'Zufällig',
  'generator.edgeHeavy': 'Randlastig',
  'generator.clustered': 'Geclustert',
  'generator.mixed': 'Gemischt',

  // Status Bar
  'statusBar.noFileLoaded': 'Keine Datei geladen',
  'statusBar.filters': 'Filter',
};
