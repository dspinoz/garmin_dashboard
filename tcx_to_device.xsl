<xsl:stylesheet version="1.0"
  xmlns:g="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:ext="http://www.garmin.com/xmlschemas/ActivityExtension/v2">

  <xsl:output method="text"/>

  <xsl:template match="/g:TrainingCenterDatabase">
    <xsl:apply-templates select="g:Activities/g:Activity"/>
  </xsl:template>
  
  <xsl:template match="g:Activity">Device<xsl:text>&#xa;</xsl:text>
    <xsl:value-of select="g:Creator/g:Name"/>
  </xsl:template>
  
</xsl:stylesheet>
