<xsl:stylesheet version="1.0"
  xmlns:g="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:ext="http://www.garmin.com/xmlschemas/ActivityExtension/v2">

  <xsl:output method="text"/>

  <xsl:template match="/g:TrainingCenterDatabase">
    <xsl:apply-templates select="g:Activities/g:Activity"/>
  </xsl:template>
  
  <xsl:template match="g:Activity">Index,Time,Position Lat,Position Lon,Heart Rate,Distance,Altitude,Lap,Cadence<xsl:text>&#xa;</xsl:text>
    <xsl:for-each select="g:Lap">
      
      <xsl:variable name="LapNo" select="position()" />
      
      <xsl:for-each select="g:Track/g:Trackpoint">
      
        <xsl:value-of select="position()"/>,<xsl:value-of select="g:Time"/>,<xsl:value-of select="g:Position/g:LatitudeDegrees"/>,<xsl:value-of select="g:Position/g:LongitudeDegrees"/>,<xsl:value-of select="g:HeartRateBpm/g:Value" />,<xsl:value-of select="g:DistanceMeters" />,<xsl:value-of select="g:AltitudeMeters" />,<xsl:value-of select="$LapNo"/>,<xsl:value-of select="g:Extensions/ext:TPX/ext:RunCadence"/><xsl:text>&#xa;</xsl:text>
      
      </xsl:for-each>
    </xsl:for-each>
    
  </xsl:template>
  
</xsl:stylesheet>
