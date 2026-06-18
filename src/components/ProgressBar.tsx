import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ProgressNode } from '../types/mechanics'

type Props = {
  nodes: ProgressNode[]
  currentIndex: number
}

export function ProgressBar({ nodes, currentIndex }: Props) {
  return (
    <View style={styles.container}>
      {nodes.map((node, i) => {
        const isDone = currentIndex > i
        const isActive = currentIndex === i
        const isBossType = node.type === 'boss'

        const nodeStyle = [
          styles.node,
          isDone && styles.nodeDone,
          isActive && styles.nodeActive,
          !isDone && !isActive && styles.nodeFuture,
          isBossType && !isActive && styles.nodeBoss,
        ]

        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <View style={styles.lineContainer}>
                <View style={[styles.line, isDone ? styles.lineDone : styles.lineFuture]} />
              </View>
            )}
            <View style={styles.nodeCol}>
              <View style={nodeStyle}>
                <Text style={styles.icon}>{node.icon}</Text>
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                {node.label}
              </Text>
            </View>
          </React.Fragment>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  lineContainer: {
    flex: 1,
    marginTop: 13,
    justifyContent: 'center',
  },
  line: {
    height: 1.5,
  },
  lineDone: {
    backgroundColor: 'rgba(168,85,247,0.3)',
  },
  lineFuture: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  nodeCol: {
    alignItems: 'center',
  },
  node: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    opacity: 0.4,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  nodeActive: {
    borderColor: '#a855f7',
    shadowColor: '#a855f7',
    shadowRadius: 6,
    shadowOpacity: 0.5,
  },
  nodeFuture: {
    opacity: 0.3,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nodeBoss: {
    borderColor: 'rgba(234,179,8,0.4)',
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontSize: 7,
    color: '#7a6030',
    marginTop: 2,
  },
  labelActive: {
    color: '#a855f7',
  },
})
