/**
 * A `GeneralSceneDescription.xml` text around the given `<Layers>` and `<AUXData>` content, so each scene test writes
 * only the part it tests, as inline XML (no third-party `.mvr` is ever committed).
 */
export function sceneXml(layers: string, auxData = ''): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<GeneralSceneDescription verMajor="1" verMinor="6"><Scene>',
    `<AUXData>${auxData}</AUXData><Layers>${layers}</Layers>`,
    '</Scene></GeneralSceneDescription>',
  ].join('\n');
}
