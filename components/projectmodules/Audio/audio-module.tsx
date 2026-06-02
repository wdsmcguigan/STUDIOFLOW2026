"use client"

import { useState, useEffect } from "react"
import {
  Music,
  Plus,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  AudioWaveformIcon as Waveform,
  Mic,
  Headphones,
  User,
  Star,
  X,
  FileAudio,
  Radio,
} from "lucide-react"

interface AudioTrack {
  id: number
  name: string
  type: "music" | "sfx" | "dialogue" | "ambient" | "podcast" | "voiceover"
  status: "active" | "inactive" | "processing" | "archived"
  duration: string
  fileSize: string
  format: string
  sampleRate: string
  bitRate: string
  artist?: string
  album?: string
  genre?: string
  bpm?: number
  key?: string
  mood?: string
  tags: string[]
  createdBy: string
  createdAt: string
  lastModified: string
  filePath: string
  waveform?: string
  notes: string
  isPlaying?: boolean
  currentTime?: number
  volume?: number
  isFavorite?: boolean
}

interface AudioModuleProps {
  searchQuery?: string
  filters?: {
    type: string
    status: string
    genre?: string
  }
  projectId?: string
}

const MOCK_AUDIO_STORE: Record<string, AudioTrack[]> = {}

export default function AudioModule({
  searchQuery = "",
  filters = { type: "all", status: "all", genre: "all" },
  projectId = "1",
}: AudioModuleProps) {
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null)
  const [playingTrack, setPlayingTrack] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [volume, setVolume] = useState(75)
  const [isShuffled, setIsShuffled] = useState(false)


  const [repeatMode, setRepeatMode] = useState<"none" | "one" | "all">("none")
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])

  useEffect(() => {
    if (MOCK_AUDIO_STORE[projectId]) {
      setAudioTracks(MOCK_AUDIO_STORE[projectId])
      return
    }

    const initialAudioTracks: AudioTrack[] = [
      {
        id: 1,
        name: "Epic Orchestral Theme",
        type: "music",
        status: "active",
        duration: "3:45",
        fileSize: "8.2 MB",
        format: "WAV",
        sampleRate: "48 kHz",
        bitRate: "1411 kbps",
        artist: "John Williams",
        album: "Film Scores Vol. 1",
        genre: "Orchestral",
        bpm: 120,
        key: "C Major",
        mood: "Epic",
        tags: ["orchestral", "epic", "cinematic", "heroic", "adventure"],
        createdBy: "Audio Team",
        createdAt: "2024-01-15",
        lastModified: "2024-01-16",
        filePath: "/audio/epic_orchestral_theme.wav",
        notes: "Perfect for opening sequence and hero moments",
        isFavorite: true,
      },
      {
        id: 2,
        name: "Ambient Forest Sounds",
        type: "ambient",
        status: "active",
        duration: "10:30",
        fileSize: "15.6 MB",
        format: "MP3",
        sampleRate: "44.1 kHz",
        bitRate: "320 kbps",
        genre: "Ambient",
        mood: "Peaceful",
        tags: ["ambient", "nature", "forest", "peaceful", "background"],
        createdBy: "Sound Designer",
        createdAt: "2024-01-14",
        lastModified: "2024-01-14",
        filePath: "/audio/ambient_forest.mp3",
        notes: "Great for outdoor scenes and establishing shots",
        isFavorite: false,
      },
      {
        id: 3,
        name: "Character Dialogue - Scene 5",
        type: "dialogue",
        status: "processing",
        duration: "2:15",
        fileSize: "4.1 MB",
        format: "WAV",
        sampleRate: "48 kHz",
        bitRate: "1411 kbps",
        tags: ["dialogue", "character", "scene5", "drama"],
        createdBy: "Recording Engineer",
        createdAt: "2024-01-13",
        lastModified: "2024-01-15",
        filePath: "/audio/dialogue_scene5.wav",
        notes: "Needs noise reduction and EQ adjustment",
        isFavorite: false,
      },
      {
        id: 4,
        name: "Action Sequence SFX",
        type: "sfx",
        status: "active",
        duration: "1:20",
        fileSize: "3.8 MB",
        format: "WAV",
        sampleRate: "96 kHz",
        bitRate: "2822 kbps",
        genre: "Sound Effects",
        tags: ["sfx", "action", "explosions", "gunshots", "impact"],
        createdBy: "SFX Library",
        createdAt: "2024-01-12",
        lastModified: "2024-01-12",
        filePath: "/audio/action_sfx.wav",
        notes: "High-quality action sound effects collection",
        isFavorite: true,
      },
      {
        id: 5,
        name: "Romantic Piano Melody",
        type: "music",
        status: "active",
        duration: "4:22",
        fileSize: "9.8 MB",
        format: "FLAC",
        sampleRate: "48 kHz",
        bitRate: "1536 kbps",
        artist: "Sarah Chen",
        album: "Intimate Moments",
        genre: "Classical",
        bpm: 72,
        key: "F Major",
        mood: "Romantic",
        tags: ["piano", "romantic", "emotional", "intimate", "classical"],
        createdBy: "Composer",
        createdAt: "2024-01-11",
        lastModified: "2024-01-11",
        filePath: "/audio/romantic_piano.flac",
        notes: "Perfect for love scenes and emotional moments",
        isFavorite: true,
      },
    ]

    if (projectId === "2") {
      initialAudioTracks.pop();
      initialAudioTracks[0].name = "Sci-Fi Theme";
      initialAudioTracks[0].genre = "Electronic";
    } else if (projectId === "3") {
      initialAudioTracks.shift();
      initialAudioTracks[0].isFavorite = true;
    }

    MOCK_AUDIO_STORE[projectId] = initialAudioTracks;
    setAudioTracks(initialAudioTracks);
  }, [projectId])

  useEffect(() => {
    if (audioTracks.length > 0 && projectId) {
      MOCK_AUDIO_STORE[projectId] = audioTracks;
    }
  }, [audioTracks, projectId])

  const filteredTracks = audioTracks.filter((track) => {
    const matchesSearch =
      track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.album?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      track.notes.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = filters.type === "all" || track.type === filters.type
    const matchesStatus = filters.status === "all" || track.status === filters.status
    const matchesGenre = !filters.genre || filters.genre === "all" || track.genre === filters.genre

    return matchesSearch && matchesType && matchesStatus && matchesGenre
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "inactive":
        return "bg-gray-500"
      case "processing":
        return "bg-yellow-500"
      case "archived":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "music":
        return <Music className="h-4 w-4" />
      case "sfx":
        return <Waveform className="h-4 w-4" />
      case "dialogue":
        return <Mic className="h-4 w-4" />
      case "ambient":
        return <Radio className="h-4 w-4" />
      case "podcast":
        return <Headphones className="h-4 w-4" />
      case "voiceover":
        return <User className="h-4 w-4" />
      default:
        return <FileAudio className="h-4 w-4" />
    }
  }

  const togglePlay = (trackId: number) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null)
    } else {
      setPlayingTrack(trackId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Audio Library</h1>
          <p className="text-white/70">Manage music, sound effects, and audio assets</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Audio
          </button>
          <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            Record
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <FileAudio className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">{audioTracks.length}</p>
              <p className="text-white/70 text-sm">Total Tracks</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Music className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-white">{audioTracks.filter((t) => t.type === "music").length}</p>
              <p className="text-white/70 text-sm">Music</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Waveform className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">{audioTracks.filter((t) => t.type === "sfx").length}</p>
              <p className="text-white/70 text-sm">SFX</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Mic className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">{audioTracks.filter((t) => t.type === "dialogue").length}</p>
              <p className="text-white/70 text-sm">Dialogue</p>
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">{audioTracks.filter((t) => t.isFavorite).length}</p>
              <p className="text-white/70 text-sm">Favorites</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player Controls */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <SkipBack className="h-5 w-5 text-white" />
            </button>
            <button className="p-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors">
              {playingTrack ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white" />}
            </button>
            <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <SkipForward className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={() => setIsShuffled(!isShuffled)}
              className={`p-2 rounded-lg transition-colors ${isShuffled ? "bg-blue-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
                }`}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const modes = ["none", "one", "all"] as const
                const currentIndex = modes.indexOf(repeatMode)
                setRepeatMode(modes[(currentIndex + 1) % modes.length])
              }}
              className={`p-2 rounded-lg transition-colors ${repeatMode !== "none" ? "bg-blue-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"
                }`}
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              {volume > 0 ? <Volume2 className="h-4 w-4 text-white" /> : <VolumeX className="h-4 w-4 text-white" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-24 accent-blue-500"
            />
            <span className="text-white/70 text-sm w-8">{volume}%</span>
          </div>
        </div>

        {playingTrack && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                {getTypeIcon(audioTracks.find((t) => t.id === playingTrack)?.type || "music")}
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">{audioTracks.find((t) => t.id === playingTrack)?.name}</h4>
                <p className="text-white/70 text-sm">
                  {audioTracks.find((t) => t.id === playingTrack)?.artist || "Unknown Artist"}
                </p>
              </div>
              <div className="text-white/70 text-sm">
                0:00 / {audioTracks.find((t) => t.id === playingTrack)?.duration}
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-white/20 rounded-full h-1">
                <div className="bg-blue-500 h-1 rounded-full" style={{ width: "25%" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audio Tracks List */}
      <div className="space-y-4">
        {filteredTracks.map((track) => (
          <div
            key={track.id}
            className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => togglePlay(track.id)}
                className="w-12 h-12 rounded-lg bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors"
              >
                {playingTrack === track.id ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white" />
                )}
              </button>

              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                {getTypeIcon(track.type)}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold">{track.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(track.status)}`}
                  >
                    {track.status.toUpperCase()}
                  </span>
                  {track.isFavorite && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
                </div>
                <div className="flex items-center gap-4 text-sm text-white/70">
                  {track.artist && <span>{track.artist}</span>}
                  <span>{track.duration}</span>
                  <span>{track.format}</span>
                  <span>{track.fileSize}</span>
                  <span className="capitalize">{track.type}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {track.tags.slice(0, 4).map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white/80">
                      {tag}
                    </span>
                  ))}
                  {track.tags.length > 4 && (
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-white/60">
                      +{track.tags.length - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTrack(track)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Eye className="h-4 w-4 text-white/70" />
                </button>
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Edit className="h-4 w-4 text-white/70" />
                </button>
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Download className="h-4 w-4 text-white/70" />
                </button>
                <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <Trash2 className="h-4 w-4 text-white/70" />
                </button>
              </div>
            </div>

            {track.notes && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-white/70 text-sm">{track.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Track Detail Modal */}
      {selectedTrack && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedTrack.name}</h2>
                <button
                  onClick={() => setSelectedTrack(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-3">Audio Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Type:</span>
                        <span className="text-white capitalize">{selectedTrack.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Duration:</span>
                        <span className="text-white">{selectedTrack.duration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Format:</span>
                        <span className="text-white">{selectedTrack.format}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">File Size:</span>
                        <span className="text-white">{selectedTrack.fileSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Sample Rate:</span>
                        <span className="text-white">{selectedTrack.sampleRate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Bit Rate:</span>
                        <span className="text-white">{selectedTrack.bitRate}</span>
                      </div>
                      {selectedTrack.bpm && (
                        <div className="flex justify-between">
                          <span className="text-white/70">BPM:</span>
                          <span className="text-white">{selectedTrack.bpm}</span>
                        </div>
                      )}
                      {selectedTrack.key && (
                        <div className="flex justify-between">
                          <span className="text-white/70">Key:</span>
                          <span className="text-white">{selectedTrack.key}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {(selectedTrack.artist || selectedTrack.album || selectedTrack.genre) && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Music Information</h3>
                      <div className="space-y-2 text-sm">
                        {selectedTrack.artist && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Artist:</span>
                            <span className="text-white">{selectedTrack.artist}</span>
                          </div>
                        )}
                        {selectedTrack.album && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Album:</span>
                            <span className="text-white">{selectedTrack.album}</span>
                          </div>
                        )}
                        {selectedTrack.genre && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Genre:</span>
                            <span className="text-white">{selectedTrack.genre}</span>
                          </div>
                        )}
                        {selectedTrack.mood && (
                          <div className="flex justify-between">
                            <span className="text-white/70">Mood:</span>
                            <span className="text-white">{selectedTrack.mood}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-medium mb-3">File Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Created by:</span>
                        <span className="text-white">{selectedTrack.createdBy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Created:</span>
                        <span className="text-white">{selectedTrack.createdAt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Last Modified:</span>
                        <span className="text-white">{selectedTrack.lastModified}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Status:</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedTrack.status)}`}
                        >
                          {selectedTrack.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrack.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs text-white">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedTrack.notes && (
                    <div>
                      <h3 className="text-white font-medium mb-3">Notes</h3>
                      <p className="text-white/80 text-sm bg-white/5 rounded-lg p-3">{selectedTrack.notes}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-white font-medium mb-3">File Path</h3>
                    <p className="text-white/70 text-sm font-mono bg-white/5 rounded-lg p-3 break-all">
                      {selectedTrack.filePath}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/20">
                <div className="flex gap-3 flex-wrap">
                  <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Play className="h-4 w-4" />
                    Play
                  </button>
                  <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors">
                    <Waveform className="h-4 w-4" />
                    Analyze
                  </button>
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
