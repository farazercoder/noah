import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCollection } from '../context/CollectionContext';
import { identifyCardsFromImage } from '../services/claudeVision';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils/constants';
import { CardData, ScanResult } from '../types';

type ScanMode = 'camera' | 'results' | 'review';

export function ScanScreen() {
  const navigation = useNavigation<any>();
  const { addNewCards } = useCollection();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      setCapturedImage(photo.uri);

      if (photo.base64) {
        const result = await identifyCardsFromImage(photo.base64, 'image/jpeg');
        result.imageUri = photo.uri;
        setScanResult(result);
        setScanMode('results');
      }
    } catch (error) {
      Alert.alert('Scan Error', 'Failed to process image. Please try again.');
      console.error('Scan error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
        allowsMultipleSelection: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      setIsProcessing(true);

      // Process each selected image
      const allCards: CardData[] = [];
      const allFlagged: CardData[] = [];

      for (const asset of result.assets) {
        let base64 = asset.base64;

        // If no base64, read the file
        if (!base64 && asset.uri) {
          const fileData = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64' as any,
          });
          base64 = fileData;
        }

        if (base64) {
          const scanResult = await identifyCardsFromImage(base64, 'image/jpeg');
          allCards.push(...scanResult.cards);
          allFlagged.push(...scanResult.flaggedCards);
        }
      }

      setCapturedImage(result.assets[0].uri);
      setScanResult({
        cards: allCards,
        flaggedCards: allFlagged,
        totalDetected: allCards.length + allFlagged.length,
        successfullyIdentified: allCards.length,
        imageUri: result.assets[0].uri,
      });
      setScanMode('results');
    } catch (error) {
      Alert.alert('Error', 'Failed to process selected images.');
      console.error('Gallery error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const addAllToCollection = useCallback(async () => {
    if (!scanResult) return;

    const allCards = [...scanResult.cards, ...scanResult.flaggedCards];
    await addNewCards(allCards);

    Alert.alert(
      'Added to Collection',
      `${allCards.length} card${allCards.length !== 1 ? 's' : ''} added.${
        scanResult.flaggedCards.length > 0
          ? ` ${scanResult.flaggedCards.length} need review.`
          : ''
      }`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }, [scanResult, addNewCards, navigation]);

  const resetScan = useCallback(() => {
    setScanMode('camera');
    setScanResult(null);
    setCapturedImage(null);
  }, []);

  // Permission not granted
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={64} color={COLORS.textMuted} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionText}>
          CardVault needs camera access to scan your sports cards.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Results view
  if (scanMode === 'results' && scanResult) {
    return (
      <View style={styles.screen}>
        <View style={styles.resultsHeader}>
          <TouchableOpacity onPress={resetScan}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.resultsTitle}>Scan Results</Text>
          <TouchableOpacity onPress={addAllToCollection} style={styles.addAllButton}>
            <Ionicons name="add-circle" size={18} color={COLORS.textPrimary} />
            <Text style={styles.addAllText}>Add All</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{scanResult.totalDetected}</Text>
            <Text style={styles.summaryLabel}>Detected</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
              {scanResult.successfullyIdentified}
            </Text>
            <Text style={styles.summaryLabel}>Identified</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: COLORS.warning }]}>
              {scanResult.flaggedCards.length}
            </Text>
            <Text style={styles.summaryLabel}>Need Review</Text>
          </View>
        </View>

        <ScrollView style={styles.resultsList}>
          {/* Confirmed Cards */}
          {scanResult.cards.length > 0 && (
            <>
              <Text style={styles.resultSectionTitle}>Identified Cards</Text>
              {scanResult.cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.resultCard}
                  onPress={() =>
                    navigation.navigate('CardDetail', { cardId: card.id, isNew: true, card })
                  }
                >
                  <View style={styles.resultCardLeft}>
                    <Text style={styles.resultPlayerName}>{card.playerName}</Text>
                    <Text style={styles.resultCardInfo}>
                      {card.year} {card.set} #{card.cardNumber}
                    </Text>
                    <View style={styles.resultBadges}>
                      <View style={[styles.sportBadge, { backgroundColor: COLORS[card.sport as keyof typeof COLORS] as string || COLORS.other }]}>
                        <Text style={styles.badgeText}>{card.sport}</Text>
                      </View>
                      {card.edition !== 'base' && (
                        <View style={styles.editionBadge}>
                          <Text style={styles.badgeText}>{card.edition}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Flagged Cards */}
          {scanResult.flaggedCards.length > 0 && (
            <>
              <Text style={styles.resultSectionTitle}>Needs Review</Text>
              {scanResult.flaggedCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.resultCard, styles.resultCardFlagged]}
                  onPress={() =>
                    navigation.navigate('CardDetail', { cardId: card.id, isNew: true, card })
                  }
                >
                  <View style={styles.resultCardLeft}>
                    <Text style={styles.resultPlayerName}>{card.playerName}</Text>
                    <Text style={styles.resultCardInfo}>
                      {card.year} {card.set} #{card.cardNumber}
                    </Text>
                    {card.reviewReason && (
                      <Text style={styles.reviewReason}>{card.reviewReason}</Text>
                    )}
                  </View>
                  <View style={styles.flaggedIcon}>
                    <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
                    <Text style={styles.tapToEdit}>Tap to edit</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Scan Cards</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Guide frame */}
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <Text style={styles.instruction}>
            Point at a binder page, top-loader, or loose card
          </Text>

          {/* Processing overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.processingText}>Identifying cards...</Text>
            </View>
          )}

          {/* Bottom controls */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
              <Ionicons name="images" size={28} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={isProcessing}
            >
              <View style={styles.captureInner} />
            </TouchableOpacity>

            <View style={{ width: 50 }} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  cameraTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  guideFrame: {
    alignSelf: 'center',
    width: '80%',
    aspectRatio: 1.4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  instruction: {
    textAlign: 'center',
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: SPACING.xxxl,
    paddingHorizontal: SPACING.xxl,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.accent,
  },
  permissionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xl,
  },
  permissionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.xl,
  },
  permissionButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  // Results styles
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
  resultsTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  addAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  addAllText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.heavy,
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  resultSectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  resultCardFlagged: {
    borderColor: COLORS.warning,
    borderWidth: 1,
  },
  resultCardLeft: {
    flex: 1,
  },
  resultPlayerName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  resultCardInfo: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  resultBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sportBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  editionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceHighlight,
  },
  badgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textPrimary,
    textTransform: 'capitalize',
  },
  reviewReason: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.warning,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  flaggedIcon: {
    alignItems: 'center',
  },
  tapToEdit: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
