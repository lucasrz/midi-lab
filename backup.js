var midi, data;
var context=null;		// the Web Audio "context" object
var midiAccess=null;	// the MIDIAccess object.
var oscillator=null;	// the single oscillator
var envelope=null;		// the envelope for the single oscillator
var attack=0.05;			// attack speed
var release=0.05;		// release speed
var portamento=0.05;	// portamento/glide speed
var activeNotes = [];	// the stack of actively-pressed keys
var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];


window.addEventListener('load', function() {

        // patch up prefixes
        window.AudioContext=window.AudioContext||window.webkitAudioContext;
        context = new AudioContext();

        // request MIDI access
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess({
                sysex: false
            }).then(onMIDISuccess, onMIDIFailure);
        } else {
            alert("No MIDI support in your browser.");
        }

        // set up the basic oscillator chain, muted to begin with.
        oscillator = context.createOscillator();
        oscillator.frequency.setValueAtTime(110, 0);
        oscillator.type = 'square';
        envelope = context.createGain();
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        envelope.gain.value = 0.0;  // Mute the sound
        oscillator.start(0);  // Go ahead and start up the oscillator
    }); 



// midi functions
function onMIDISuccess(midiAccess) {
    // when we get a succesful response, run this code
    midi = midiAccess; // this is our raw MIDI data, inputs, outputs, and sysex status

    var inputs = midi.inputs.values();
    // loop over all available inputs and listen for any MIDI input
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        // each time there is a midi message call the onMIDIMessage function
        input.value.onmidimessage = onMIDIMessage;
    }
}

function onMIDIFailure(error) {
    // when we get a failed response, run this code
    console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + error);
}

function onMIDIMessage(message) {
    data = message.data; // this gives us our [command/channel, note, velocity] data.
    cmd = data[0] >> 4;
    channel = data[0] & 0xf;
    type = data [0] & 0xf0;
    note = data[1];
    velocity = data[2];

    switch(type) {
        case 144: //noteOn message
             noteOn(note, velocity);
             break;
        case 128: //noteOff message
             noteOff(note, velocity);
             break;
    }
    
    // console.log('MIDI data', data); // MIDI data [144, 63, 73]
}


function frequencyFromNoteNumber( note ) {
    return 440 * Math.pow(2,(note-69)/12);
}

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}


function noteOn(midiNote, velocity){
    var note = noteFromPitch(frequencyFromNoteNumber(midiNote));
    console.log(noteStrings[note % 12]);
    activeNotes.push( midiNote );
    oscillator.frequency.cancelScheduledValues(0);
    oscillator.frequency.setTargetAtTime( frequencyFromNoteNumber(midiNote), 0, 0.1 );
    envelope.gain.cancelScheduledValues(0);
    envelope.gain.setTargetAtTime(1.0, 0, attack);
}

function noteOff(midiNote, velocity){
    var position = activeNotes.indexOf(midiNote);
        if (position!=-1) {
            activeNotes.splice(position,1);
        }
        if (activeNotes.length==0) {	
            // shut off the envelope
            envelope.gain.cancelScheduledValues(0);
            envelope.gain.setTargetAtTime(0.0, 0, release );
        } else {
            oscillator.frequency.cancelScheduledValues(0);
            oscillator.frequency.setTargetAtTime( frequencyFromNoteNumber(activeNotes[activeNotes.length-1]), 0, portamento );
        }
}


