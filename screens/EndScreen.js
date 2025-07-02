import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Share,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useGame } from '../context/useGame';
import ActionButton from '../components/ActionButton';
import { COLORS, SIZES } from '../constants/theme';

/**
 * End-of-game screen — everything (scorboard + buttons) scrolls together.
 */
const EndScreen = ({ navigation }) => {
  /* ────── STATE ────── */
  const { gameState, actions } = useGame();
  const {
    players = [],
    message: endScreenMessage,
    gamePhase,
    selectedPlayerForTask,
    targetScore = 20,
  } = gameState;

  /* winner / loser / sorted list */
  const { winner, loser, sortedPlayers } = useMemo(() => {
    if (!players.length) return { winner: null, loser: null, sortedPlayers: [] };

    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const winnerPlayer = sorted[0];
    const explicitLoser = players.find(p => p.id === selectedPlayerForTask);
    const implicitLoser = sorted.at(-1);
    const loserPlayer =
      explicitLoser || (implicitLoser?.id !== winnerPlayer?.id ? implicitLoser : null);

    return { winner: winnerPlayer, loser: loserPlayer, sortedPlayers: sorted };
  }, [players, selectedPlayerForTask]);
  
  /* ────── EFFECTS ────── */
  const confettiRef = useRef(null);

  useEffect(() => {
    if (winner) {
      const t = setTimeout(() => {
        confettiRef.current?.start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [winner]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.(
      `Oyun sona erdi. Kazanan: ${winner?.name ?? 'belirlenemedi'}`,
    );
  }, [winner]);

  /* ────── ACTIONS ────── */
  const handleNewGame = useCallback(() => {
    actions.restartGame();
    navigation.replace('Setup');
  }, [actions, navigation]);

  const handleReplay = useCallback(() => {
    actions.restartWithSamePlayers();
    navigation.replace('Game');
  }, [actions, navigation]);


  const handleDrawBlackCard = useCallback(() => {
    // Simple haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    // Immediate assignment without animations
    actions.assignAndFinishBlackCard();
  }, [actions]);

  const handleShareResults = useCallback(async () => {
    try {
      let msg = 'Kart Oyunu Sonuçları\n\n';
      if (winner) msg += ` Kazanan: ${winner.avatarId} ${winner.name} (${winner.score} Puan)\n`;
      msg += `🎯 Hedef Puan: ${targetScore}\n`;
      if (loser) msg += `⚫️ Siyah Kart: ${loser.avatarId} ${loser.name}\n`;
      msg += '\nSkor Tablosu:\n';
      sortedPlayers.forEach((p, i) => {
        msg += `${i + 1}. ${p.avatarId} ${p.name}: ${p.score} Puan\n`;
      });
      await Share.share({ message: msg.trim() });
    } catch (e) {
      console.error('share error', e);
    }
  }, [sortedPlayers, winner, loser, targetScore]);

  /* ────── RENDERERS ────── */
  const renderScoreRow = useCallback(
    ({ item, index }) => {
      const isWinner = item.id === winner?.id;
      const isLoser  = item.id === loser?.id;

      return (
        <MotiView
          from={{ opacity: 0, translateX: -15 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 150 + index * 40 }}
          style={[
            styles.scoreRow,
            isWinner && styles.winnerRow,
            isLoser && styles.loserRow,
          ]}
        >
          <Text style={styles.rankText}>{index + 1}.</Text>
          <Text style={styles.avatarText}>{item.avatarId || '👤'}</Text>
          <Text style={styles.scoreName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.scorePoints}>{item.score ?? 0}</Text>
        </MotiView>
      );
    },
    [winner, loser],
  );

  /* ────── UI ────── */
  return (
    <LinearGradient 
      colors={['#1a0000', '#330000', '#1a1a1a']} 
      style={styles.flexFill}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* Confetti */}
        <ConfettiCannon
          ref={confettiRef}
          autoStart={false}
          fadeOut
          count={winner ? 240 : 0}
          origin={{ x: -10, y: 0 }}
          explosionSpeed={420}
          fallSpeed={2900}
          colors={['#8B0000', '#FF4500', '#DC143C', '#B22222']}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Ultra Scary Header */}
          <View style={styles.horrorHeader}>
            <Text style={styles.horrorTitle}>KADER GÜNÜ </Text>
            
            <View
              style={[styles.horrorWinnerContainer, !winner && styles.noWinnerContainer]}
              accessibilityLiveRegion="polite"
            >
              {winner ? (
                <>
                  <Text style={styles.winnerAnnouncement}>
                    KAZANAN
                  </Text>
                  <Text style={styles.horrorWinnerText}>
                     {winner.avatarId} {winner.name}
                  </Text>
                  <Text style={styles.scoreDisplay}>
                    {winner.score} PUAN
                  </Text>
                </>
              ) : (
                <Text style={styles.noWinnerText}>
                  🌑 KARARTMA - GALİP BELİRSİZ 🌑
                </Text>
              )}
              <Text style={styles.horrorTargetText}>
                 Hedef Puan: {targetScore} 
              </Text>
            </View>
          </View>

          {/* Scores */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 250 }}
            style={styles.scoresContainer}
          >
            <Text style={styles.horrorScoresTitle}>Oyuncu Skorları</Text>
            <FlatList
              data={sortedPlayers}
              keyExtractor={item => String(item.id)}
              renderItem={renderScoreRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scoresList}
              scrollEnabled={false}   /* outer ScrollView handles scrolling */
            />
          </MotiView>

          {/* Ultra Scary Black Card Section */}
          <View style={styles.horrorCardContainer}>
            {/* Static Horror Icons */}
            <View style={styles.horrorIconContainer}>
              <Ionicons
                name="skull"
                size={SIZES.iconSizeLarge * 1.8}
                color="#8B0000"
                style={styles.primarySkull}
              />
              <Ionicons
                name="flame"
                size={SIZES.iconSizeLarge * 0.8}
                color="#FF4500"
                style={styles.leftFlame}
              />
              <Ionicons
                name="flame"
                size={SIZES.iconSizeLarge * 0.8}
                color="#FF4500"
                style={styles.rightFlame}
              />
            </View>

            {/* Dramatic Card Drawing Area */}
            {gamePhase === 'assigningBlackCard' && loser && (
              <View style={styles.doomContainer}>
                <Text style={styles.doomTitle}>🔥 KADER ÇARKI 🔥</Text>
                <Text style={styles.victimText}>
                  {loser.avatarId} {loser.name}
                </Text>
                <Text style={styles.doomSubtext}>
                  Kaderin karşısında çaresizsin...
                </Text>
                
                <View style={styles.wheelOfDoom}>
                  <Text style={styles.wheelText}>💀</Text>
                </View>

                <ActionButton
                  title="KADERE TESLIM OL!"
                  onPress={handleDrawBlackCard}
                  type="danger"
                  iconLeft="skull"
                  style={styles.doomButton}
                />
              </View>
            )}


            {/* Final Message Display */}
            {gamePhase === 'ended' && endScreenMessage && (
              <View style={styles.finalMessageContainer}>
                <Text style={styles.finalMessageTitle}>
                  KADER BELİRLENDİ 
                </Text>
                <Text style={styles.finalMessageText}>
                  {endScreenMessage}
                </Text>
                <Text style={styles.fearText}>
                  Görev seni bekliyor...
                </Text>
              </View>
            )}
          </View>

          {/* Bottom actions (scrolls together) */}
          {gamePhase === 'ended' && (
            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 500 }}
              style={styles.bottomActionContainer}
            >
              <ActionButton
                title="Tekrar Oyna (Aynı Kadro)"
                onPress={handleReplay}
                iconLeft="refresh-outline"
                type="primary"
                style={styles.actionButton}
              />
              <ActionButton
                title="Yeni Oyun Kur"
                onPress={handleNewGame}
                iconLeft="people-outline"
                type="secondary"
                style={styles.actionButton}
              />
              <ActionButton
                title="Sonuçları Paylaş"
                onPress={handleShareResults}
                iconLeft="share-social-outline"
                type="outline"
                style={styles.actionButton}
              />
            </MotiView>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

/* ────── STYLES ────── */
const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  safeArea: { flex: 1 },

  scroll:  { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.paddingLarge,
  },

  /* Horror Header */
  horrorHeader: { 
    width: '100%', 
    alignItems: 'center', 
    marginBottom: SIZES.marginMedium,
    padding: SIZES.paddingMedium,
  },
  horrorTitle: {
    fontSize: SIZES.h1 * 1.4,
    fontFamily: SIZES.bold,
    color: '#FF4500',
    textAlign: 'center',
    marginBottom: SIZES.marginMedium,
    textShadowColor: '#8B0000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
  horrorWinnerContainer: {
    paddingVertical: SIZES.padding * 1.2,
    paddingHorizontal: SIZES.paddingLarge,
    borderRadius: SIZES.buttonRadius * 1.5,
    borderWidth: 3,
    borderColor: '#FF4500',
    backgroundColor: 'rgba(139,0,0,0.4)',
    shadowColor: 'rgba(139,0,0,0.4)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 15,
  },
  noWinnerContainer: {
    backgroundColor: 'rgba(139,0,0,0.4)',
    borderColor: COLORS.textMuted,
  },
  winnerAnnouncement: {
    fontSize: SIZES.h2,
    fontFamily: SIZES.bold,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: SIZES.marginSmall,
    textShadowColor: 'rgba(139,0,0,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  horrorWinnerText: {
    fontSize: SIZES.title * 1.3,
    fontFamily: SIZES.bold,
    color: '#FF4500',
    textAlign: 'center',
    marginBottom: SIZES.marginSmall,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scoreDisplay: {
    fontSize: SIZES.body * 1.1,
    fontFamily: SIZES.bold,
    color: '#DC143C',
    textAlign: 'center',
    marginBottom: SIZES.marginSmall,
  },
  horrorTargetText: {
    fontSize: SIZES.body,
    fontFamily: SIZES.regular,
    color: '#8B0000',
    textAlign: 'center',
    marginTop: SIZES.marginSmall,
    fontStyle: 'italic',
  },
  noWinnerText: { 
    color: COLORS.textSecondary,
    fontSize: SIZES.title,
    fontFamily: SIZES.bold,
    textAlign: 'center',
  },

  /* Scores */
  scoresContainer: {
    width: '95%',
    maxWidth: SIZES.contentMaxWidth,
    backgroundColor: COLORS.scoreboardBg,
    borderRadius: SIZES.cardRadius * 1.1,
    paddingVertical: SIZES.paddingMedium,
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.marginLarge,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  horrorScoresTitle: {
    fontSize: SIZES.h3,
    fontFamily: SIZES.bold,
    color: '#FF4500',
    textAlign: 'center',
    marginBottom: SIZES.marginMedium,
    textShadowColor: '#8B0000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  scoresList: { paddingBottom: SIZES.padding },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.padding * 0.8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  winnerRow: {
    backgroundColor: 'rgba(72,187,120,0.15)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.positive,
    paddingLeft: SIZES.paddingSmall,
  },
  loserRow: {
    backgroundColor: 'rgba(245,101,101,0.12)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.negative,
    paddingLeft: SIZES.paddingSmall,
  },
  rankText: {
    width: 28,
    textAlign: 'right',
    marginRight: SIZES.base * 1.2,
    fontSize: SIZES.body,
    fontFamily: SIZES.bold,
    color: COLORS.textMuted,
  },
  avatarText: { fontSize: SIZES.title, marginRight: SIZES.base },
  scoreName: {
    flex: 1,
    fontSize: SIZES.body,
    fontFamily: SIZES.regular,
    color: COLORS.textPrimary,
  },
  scorePoints: {
    minWidth: 45,
    textAlign: 'right',
    fontSize: SIZES.body * 1.05,
    fontFamily: SIZES.bold,
    color: COLORS.textPrimary,
  },

  /* Ultra Horror Black Card Styles */
  horrorCardContainer: {
    width: '95%',
    maxWidth: SIZES.contentMaxWidth,
    alignItems: 'center',
    padding: SIZES.paddingLarge,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: SIZES.cardRadius * 1.1,
    borderWidth: 3,
    borderColor: '#8B0000',
    marginBottom: SIZES.marginLarge,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
  bloodEffect: {
    backgroundColor: 'rgba(139,0,0,0.3)',
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
  },
  horrorIconContainer: {
    alignItems: 'center',
    marginBottom: SIZES.marginMedium,
    position: 'relative',
  },
  primarySkull: {
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  leftFlame: {
    position: 'absolute',
    left: -40,
    top: 10,
  },
  rightFlame: {
    position: 'absolute',
    right: -40,
    top: 10,
  },
  doomContainer: {
    alignItems: 'center',
    width: '100%',
  },
  doomTitle: {
    fontSize: SIZES.h2,
    fontFamily: SIZES.bold,
    color: '#FF4500',
    textAlign: 'center',
    marginBottom: SIZES.marginSmall,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  victimText: {
    fontSize: SIZES.title * 1.3,
    fontFamily: SIZES.bold,
    color: '#8B0000',
    textAlign: 'center',
    marginBottom: SIZES.marginSmall,
    textShadowColor: '#FFF',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  doomSubtext: {
    fontSize: SIZES.body,
    fontFamily: SIZES.regular,
    color: '#DC143C',
    textAlign: 'center',
    marginBottom: SIZES.marginLarge,
    fontStyle: 'italic',
  },
  wheelOfDoom: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139,0,0,0.8)',
    borderWidth: 4,
    borderColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.marginLarge,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 15,
  },
  wheelText: {
    fontSize: SIZES.h1,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  doomButton: {
    marginTop: SIZES.marginMedium,
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#8B0000',
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  cardDrawingArea: {
    alignItems: 'center',
    width: '100%',
  },
  drawingText: {
    fontSize: SIZES.h3,
    fontFamily: SIZES.bold,
    color: '#FF4500',
    textAlign: 'center',
    marginBottom: SIZES.marginLarge,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    maxWidth: 280,
  },
  fateCard: {
    width: 35,
    height: 50,
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  revealedCard: {
    backgroundColor: '#8B0000',
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
  },
  finalCard: {
    width: 45,
    height: 65,
    borderWidth: 3,
  },
  cardEmoji: {
    fontSize: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardBack: {
    fontSize: 18,
    color: '#999',
    fontFamily: SIZES.bold,
  },
  finalMessageContainer: {
    alignItems: 'center',
    width: '100%',
    padding: SIZES.paddingMedium,
    backgroundColor: 'rgba(139,0,0,0.2)',
    borderRadius: SIZES.cardRadius,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  finalMessageTitle: {
    fontSize: SIZES.h3,
    fontFamily: SIZES.bold,
    color: '#FF4500',
    textAlign: 'center',
    marginBottom: SIZES.marginSmall,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  finalMessageText: {
    fontSize: SIZES.body,
    lineHeight: SIZES.body * 1.6,
    textAlign: 'center',
    color: '#DC143C',
    marginBottom: SIZES.marginMedium,
    fontFamily: SIZES.regular,
  },
  fearText: {
    fontSize: SIZES.caption,
    color: '#8B0000',
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },

  /* Bottom buttons */
  bottomActionContainer: {
    width: '90%',
    maxWidth: SIZES.buttonMaxWidth,
    alignItems: 'center',
    paddingTop: SIZES.margin,
    marginBottom: SIZES.marginLarge, /* so last button nefes alır */
  },
  actionButton: {
    width: '100%',
    marginBottom: SIZES.marginSmall * 1.25,
  },

  /* Target Score */
  targetScoreText: {
    fontSize: SIZES.body,
    fontFamily: SIZES.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.marginSmall,
  },
});

export default EndScreen;
